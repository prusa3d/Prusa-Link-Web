import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { handleApi } from './api.ts';
import { MockPrinter } from './printer.ts';
import { seedFirmware } from './seed.ts';

interface Schema {
  $ref?: string;
  properties?: Record<string, unknown>;
}

interface Spec {
  paths: Record<
    string,
    {
      get?: {
        responses: Record<
          string,
          { content?: Record<string, { schema: Schema }> }
        >;
      };
    }
  >;
  components: { schemas: Record<string, Schema> };
}

const spec = parse(
  readFileSync(new URL('../spec/openapi.yaml', import.meta.url), 'utf8'),
) as Spec;

function responseSchema(path: string): Schema {
  const schema =
    spec.paths[path]?.get?.responses['200']?.content?.['application/json']
      ?.schema;
  if (!schema) throw new Error(`spec has no 200 JSON response for GET ${path}`);
  const name = schema.$ref?.split('/').pop();
  return name ? (spec.components.schemas[name] ?? {}) : schema;
}

const authed = (printer: MockPrinter) => ({ 'x-api-key': printer.apiKey });

const get = (printer: MockPrinter, path: string) =>
  handleApi(printer, { method: 'GET', path, headers: authed(printer) });

describe('mock printer API', () => {
  it.each([
    '/api/version',
    '/api/v1/info',
    '/api/v1/status',
    '/api/v1/storage',
  ])('%s answers 200 with only properties the spec defines', (path) => {
    const res = get(new MockPrinter(), path);
    expect(res.status).toBe(200);
    const known = Object.keys(responseSchema(path).properties ?? {});
    if (known.length) {
      const sent = Object.keys(res.body as Record<string, unknown>);
      expect(sent.filter((k) => !known.includes(k))).toEqual([]);
    }
  });

  it('starts a print from storage and reports it in status', () => {
    const printer = new MockPrinter();
    const [first] = printer.files;
    const res = handleApi(printer, {
      method: 'POST',
      path: `/api/v1/files/usb/${first?.name ?? ''}`,
      headers: authed(printer),
    });
    expect(res.status).toBe(204);
    const status = get(printer, '/api/v1/status').body as {
      printer: { state: string };
    };
    expect(status.printer.state).toBe('PRINTING');
  });

  it('refuses a second print while printing', () => {
    const printer = new MockPrinter();
    const [first, second] = printer.files;
    printer.startPrint(first?.name ?? '');
    expect(printer.startPrint(second?.name ?? '')).toBe(false);
  });

  it('answers a request without a key with a Digest challenge, as the firmware does', () => {
    const res = handleApi(new MockPrinter(), {
      method: 'GET',
      path: '/api/version',
      headers: {},
    });
    expect(res.status).toBe(401);
    expect(res.headers?.['www-authenticate']).toMatch(/^Digest /);
  });

  it('answers a wrong key with an ApiKey challenge, which browsers do not prompt for', () => {
    const res = handleApi(new MockPrinter(), {
      method: 'GET',
      path: '/api/version',
      headers: { 'x-api-key': 'wrong' },
    });
    expect(res.status).toBe(401);
    expect(res.headers?.['www-authenticate']).toMatch(/^ApiKey /);
  });

  it('has one tool per INDX dock', () => {
    const printer = new MockPrinter();
    printer.setModel('COREONE_INDX');
    expect(printer.tools).toHaveLength(8);
  });
});

describe('seeded printer', () => {
  it.each([
    'MK4S',
    'XL',
    'XL_2',
    'XL_SINGLE',
    'COREONE',
    'COREONE_INDX',
  ] as const)(
    '%s starts idle and cold with files on the USB stick',
    (model) => {
      const printer = new MockPrinter(model);
      expect(printer.state).toBe('IDLE');
      expect(printer.job).toBeUndefined();
      expect(printer.files.length).toBeGreaterThanOrEqual(6);
      expect(printer.tools.every((t) => t.temp < 30 && t.target === 0)).toBe(
        true,
      );
      expect(
        new Set(
          printer.files.map((f) => `${f.dir}/${f.name}/${f.display_name}`),
        ).size,
      ).toBe(printer.files.length);
      expect(
        printer.files.every((f) =>
          /^[A-Z0-9_]{1,6}~\d+\.(BGC|GCO)$/.test(f.name),
        ),
      ).toBe(true);
    },
  );

  it('lists folders, including the ones an OS leaves, and nested files', () => {
    const printer = new MockPrinter();
    expect(printer.list('').folders).toEqual(
      expect.arrayContaining(['.Trashes', 'organizers', 'toys']),
    );
    expect(printer.list('toys').folders).toEqual(['dragons']);
    expect(printer.list('toys/dragons').files).toHaveLength(1);
  });

  it('serves a nested folder and prints a file from it', () => {
    const printer = new MockPrinter();
    const res = handleApi(printer, {
      method: 'GET',
      path: '/api/v1/files/usb/toys/dragons',
      headers: authed(printer),
    });
    const children = (res.body as { children: { name: string }[] }).children;
    expect(children).toHaveLength(1);
    const started = handleApi(printer, {
      method: 'POST',
      path: `/api/v1/files/usb/toys/dragons/${children[0]?.name ?? ''}`,
      headers: authed(printer),
    });
    expect(started.status).toBe(204);
  });

  it('lists the newest file first', () => {
    const [first, second] = new MockPrinter().files.filter(
      (f) => !f.display_name.startsWith('.'),
    );
    expect(first?.m_timestamp).toBeGreaterThan(second?.m_timestamp ?? Infinity);
  });

  it('runs a print for the time the slicer estimated', () => {
    const printer = new MockPrinter();
    const [file] = printer.files;
    printer.startPrint(file?.name ?? '');
    expect(printer.job?.time_remaining).toBe(file?.print_time);
  });

  it('gives an uploaded file a free short name', () => {
    const printer = new MockPrinter();
    const before = printer.files.length;
    const name = printer.upload('3DBenchy_other.bgcode', 10);
    expect(name).toMatch(/^3DBENC~\d\.BGC$/);
    expect(printer.file(name)).toBeDefined();
    expect(printer.files).toHaveLength(before + 1);
  });

  it('takes firmware into the USB root only, like the printer', () => {
    const printer = new MockPrinter();
    const before = printer.files.length;
    const put = (path: string, headers: Record<string, string> = {}) =>
      handleApi(printer, {
        method: 'PUT',
        path: `/api/v1/files/usb/${path}`,
        body: new Uint8Array(4),
        headers: { ...authed(printer), ...headers },
      }).status;
    expect(put('MK4_MK4S_MK3.9_MK3.9S_firmware_8.0.2.bbf')).toBe(201);
    expect(put('toys/MK4_MK4S_MK3.9_MK3.9S_firmware_8.0.2.bbf')).toBe(422);
    expect(
      put('MK4_MK4S_MK3.9_MK3.9S_firmware_8.0.2.bbf', {
        'print-after-upload': '?1',
      }),
    ).toBe(422);
    expect(put('notes.txt')).toBe(415);
    expect(printer.firmwareUploads).toEqual([
      'MK4_MK4S_MK3.9_MK3.9S_firmware_8.0.2.bbf',
    ]);
    expect(printer.files).toHaveLength(before);
  });
});

const send = (
  printer: MockPrinter,
  method: string,
  path: string,
  body?: unknown,
  query?: string,
) =>
  handleApi(printer, {
    method,
    path,
    ...(query !== undefined && { query }),
    headers: authed(printer),
    ...(body !== undefined && {
      body: new TextEncoder().encode(JSON.stringify(body)),
    }),
  });

describe('PrusaLink 2 API', () => {
  it('reports tools, materials and features in /info, with an ETag', () => {
    const printer = new MockPrinter('XL');
    const res = get(printer, '/api/v1/info');
    const info = res.body as {
      tool_count: number;
      tools: Record<string, { material_package_instance?: unknown }>;
      features: string[];
    };
    expect(info.tool_count).toBe(5);
    expect(Object.keys(info.tools)).toEqual(['0', '1', '2', '3', '4']);
    expect(info.features).toContain('cancel_object');
    const again = handleApi(printer, {
      method: 'GET',
      path: '/api/v1/info',
      headers: { ...authed(printer), 'if-none-match': res.headers?.etag },
    });
    expect(again.status).toBe(304);
  });

  it('answers ?expanded=true with every tool, or 404 like old firmware', () => {
    const printer = new MockPrinter('XL_2');
    printer.parked = false;
    printer.activeTool = 1;
    const res = send(
      printer,
      'GET',
      '/api/v1/status',
      undefined,
      'expanded=true',
    );
    const tools = (
      res.body as { printer: { tools: Record<string, { active: boolean }> } }
    ).printer.tools;
    expect(Object.keys(tools)).toEqual(['0', '1']);
    expect(tools['1']?.active).toBe(true);
    printer.apiV2 = false;
    expect(
      send(printer, 'GET', '/api/v1/status', undefined, 'expanded=true').status,
    ).toBe(404);
    expect(get(printer, '/api/v1/status').status).toBe(200);
  });

  it('shows a dialog and takes its buttons', () => {
    const printer = new MockPrinter();
    printer.showDialog({
      state: 'ATTENTION',
      code: '12301',
      title: 'FILAMENT RUNOUT',
      text: '…',
      buttons: ['Continue'],
    });
    const d = get(printer, '/api/v1/dialog').body as { dialog_id: number };
    expect(
      send(printer, 'POST', `/api/v1/dialog/${String(d.dialog_id)}`, {
        button: 'Nope',
      }).status,
    ).toBe(400);
    expect(
      send(printer, 'POST', '/api/v1/dialog/999', { button: 'Continue' })
        .status,
    ).toBe(404);
    expect(
      send(printer, 'POST', `/api/v1/dialog/${String(d.dialog_id)}`, {
        button: 'Continue',
      }).status,
    ).toBe(204);
    expect(get(printer, '/api/v1/dialog').status).toBe(204);
  });

  it('lists the objects of a print from its file and cancels one', async () => {
    MockPrinter.fixtures['three-shapes.bgcode'] = new Uint8Array(
      readFileSync(new URL('./fixtures/three-shapes.bgcode', import.meta.url)),
    );
    const printer = new MockPrinter('COREONE_INDX');
    const shapes = printer.files.find(
      (f) => f.fixture === 'three-shapes.bgcode',
    );
    if (!shapes) throw new Error('no fixture file');
    printer.startPrint(shapes.name);
    await expect.poll(() => printer.job?.objects.length).toBe(3);
    const id = String(printer.job?.id);
    const list = get(printer, `/api/v1/job/${id}/objects`).body as {
      objects: { id: number; name: string; canceled: boolean }[];
    };
    expect(list.objects.map((o) => o.name)).toEqual([
      'Shape-Cylinder',
      'Shape-Sphere',
      'Shape-Box',
    ]);
    expect(
      send(printer, 'PUT', `/api/v1/job/${id}/objects/1/cancel`).status,
    ).toBe(204);
    expect(printer.job?.objects[1]?.canceled).toBe(true);
    expect(
      send(printer, 'PUT', `/api/v1/job/${id}/objects/7/cancel`).status,
    ).toBe(404);
  });

  it('preheats only when idle and babysteps only while printing', () => {
    const printer = new MockPrinter();
    expect(
      send(printer, 'PUT', '/api/v1/printer', { z_offset_delta: -0.025 })
        .status,
    ).toBe(409);
    expect(
      send(printer, 'POST', '/api/v1/printer/preheat', { filament: 'PETG' })
        .status,
    ).toBe(204);
    expect(printer.bed.target).toBe(85);
    printer.state = 'PRINTING';
    expect(
      send(printer, 'POST', '/api/v1/printer/preheat', { filament: 'PLA' })
        .status,
    ).toBe(409);
    expect(
      send(printer, 'PUT', '/api/v1/printer', { z_offset_delta: -0.025 })
        .status,
    ).toBe(204);
    expect(printer.zOffset).toBe(-0.025);
    expect(send(printer, 'PUT', '/api/v1/printer', { nope: 1 }).status).toBe(
      422,
    );
  });

  it('loads filament into a tool by its OpenPrintTag fields', () => {
    const printer = new MockPrinter('XL');
    expect(
      send(printer, 'POST', '/api/v1/tools/2/filament', {
        command: 'load',
        material: { material_type: 'PETG', primary_color: '#00ff00' },
      }).status,
    ).toBe(202);
    for (let i = 0; i < 5; i++) printer.tick();
    expect(printer.tools[2]).toMatchObject({
      material: 'PETG',
      color: '#00ff00',
    });
    expect(
      send(printer, 'POST', '/api/v1/tools/2/filament', {
        command: 'load',
        material: { material_type: 'UNOBTAINIUM' },
      }).status,
    ).toBe(422);
  });

  it('lists firmware in the root and flashes only newer ones', () => {
    const printer = new MockPrinter('COREONE');
    printer.firmwareUploads = seedFirmware('COREONE');
    const root = get(printer, '/api/v1/files/usb').body as {
      children: { type: string; name: string; display_name: string }[];
    };
    const firmware = root.children.filter((c) => c.type === 'FIRMWARE');
    expect(firmware).toHaveLength(3);
    const meta = (name: string) =>
      (
        get(printer, `/api/v1/files/usb/${name}`).body as {
          meta: { relation: string; compatible: boolean };
        }
      ).meta;
    const [newer, older, other] = firmware.map((f) => f.name);
    expect(meta(newer ?? '')).toMatchObject({
      relation: 'newer',
      compatible: true,
    });
    expect(
      send(printer, 'POST', `/api/v1/files/usb/${older ?? ''}`).status,
    ).toBe(409);
    expect(
      send(printer, 'POST', `/api/v1/files/usb/${other ?? ''}`).status,
    ).toBe(422);
    expect(
      send(printer, 'POST', `/api/v1/files/usb/${newer ?? ''}`).status,
    ).toBe(202);
    expect(printer.firmware).toBe('8.0.2');
    expect(get(printer, '/api/version').status).toBe(503);
  });

  it('starts a print with a tool mapping the printer accepts', () => {
    const printer = new MockPrinter('XL');
    const file = printer.files[0]?.name ?? '';
    const start = (tool_mapping: unknown) =>
      send(printer, 'POST', `/api/v1/files/usb/${file}`, { tool_mapping });
    expect(start({ '1': [1, 1] }).status).toBe(422);
    expect(start({ '1': [9] }).status).toBe(422);
    expect(start({ '1': [3, 5], '2': [1] }).status).toBe(204);
    expect(printer.job?.mapping).toEqual({ '1': [3, 5], '2': [1] });
  });

  it('suggests and runs a change of every tool a print needs', async () => {
    MockPrinter.fixtures['three-shapes.bgcode'] = new Uint8Array(
      readFileSync(new URL('./fixtures/three-shapes.bgcode', import.meta.url)),
    );
    const printer = new MockPrinter('XL');
    printer.tools[0] = {
      ...printer.tools[0],
      material: 'PETG',
      temp: 20,
      target: 0,
    };
    const shapes = printer.files.find(
      (f) => f.fixture === 'three-shapes.bgcode',
    );
    if (!shapes) throw new Error('no fixture file');
    printer.header(shapes);
    await expect.poll(() => printer.header(shapes)).toBeDefined();
    const query = `for=${encodeURIComponent(`/usb/${shapes.name}`)}`;
    const res = send(
      printer,
      'GET',
      '/api/v1/filament/change-all',
      undefined,
      query,
    );
    const items = (res.body as { items: Record<string, unknown> }).items;
    expect(items).toEqual({
      '1': {
        action: 'change',
        material: { material_type: 'PLA' },
        color: '#F58231',
      },
    });
    expect(
      send(printer, 'POST', '/api/v1/filament/change-all', { items }).status,
    ).toBe(202);
    for (let i = 0; i < 6; i++) printer.tick();
    expect(printer.tools[0].material).toBe('PLA');
  });
});
