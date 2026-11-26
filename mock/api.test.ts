import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { handleApi } from './api.ts';
import { MockPrinter } from './printer.ts';

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
  it.each(['MK4S', 'XL', 'XL_SINGLE', 'COREONE', 'COREONE_INDX'] as const)(
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
        printer.files.every((f) => /^[A-Z0-9_]{1,6}~\d+\.BGC$/.test(f.name)),
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
});
