import type { paths } from '../src/lib/api/schema';
import {
  type Change,
  filePath,
  type MockTool,
  IDLE_STATES,
  PRINTER_CODE,
  type MockPrinter,
} from './printer.ts';
import { FILAMENTS, firmwarePrefix } from './seed.ts';
import { mockThumbnail } from './thumbnail.ts';

/// The body a spec operation answers with on 200. Every handler below returns
/// one of these, so a spec change the mock does not follow fails type-checking.
type Ok<P extends keyof paths, M extends keyof paths[P]> = paths[P][M] extends {
  responses: { 200: { content: { 'application/json': infer B } } };
}
  ? B
  : never;

export interface MockResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
  /// How long the printer takes to answer, beyond the network.
  delayMs?: number;
}

export interface MockRequest {
  method: string;
  path: string;
  /// The query string without `?`.
  query?: string;
  /// A Node Buffer in the dev server, plain bytes in the browser demo.
  body?: Uint8Array;
  headers: Record<string, string | string[] | undefined>;
}

const json = (body: unknown, status = 200): MockResponse => ({ status, body });
const empty = (status: number): MockResponse => ({ status });

function readJson(req: MockRequest): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(
      new TextDecoder().decode(req.body ?? new Uint8Array()),
    );
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

/// A weak ETag of a body, for If-None-Match.
function etag(body: unknown): string {
  let h = 0;
  for (const c of JSON.stringify(body)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return `W/"${(h >>> 0).toString(16)}"`;
}

function cached(req: MockRequest, body: unknown, tag = etag(body)) {
  if (req.headers['if-none-match'] === tag)
    return { status: 304, headers: { etag: tag } };
  return { status: 200, body, headers: { etag: tag } };
}

const FEATURES = [
  'status_expanded',
  'cancel_object',
  'dialogs',
  'firmware_update',
  'preheat',
  'tune',
  'filament',
] as const;

/// `8.0.2`, `6.4.0-rc1` from a release file name.
const firmwareVersion = (name: string) =>
  /_firmware_(\d+\.\d+\.\d+[^.]*)\.bbf$/i.exec(name)?.[1];

function compareVersions(a: string, b: string): number {
  const parts = (v: string) =>
    v
      .replace(/\+.*$/, '')
      .split(/[.-]/)
      .map((p) => (/^\d+$/.test(p) ? Number(p) : p));
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const [p, q] = [x[i], y[i]];
    if (p === q) continue;
    // A prerelease (`-rc1`) is older than its release.
    if (p === undefined) return typeof q === 'string' ? 1 : -1;
    if (q === undefined) return typeof p === 'string' ? -1 : 1;
    if (typeof p === 'number' && typeof q === 'number') return p - q;
    return String(p) < String(q) ? -1 : 1;
  }
  return 0;
}

const RELATION = ['older', 'same', 'newer'] as const;

function firmwareMeta(printer: MockPrinter, name: string) {
  const version = firmwareVersion(name) ?? '0.0.0';
  const order = compareVersions(version, printer.firmware);
  return {
    version,
    printer_type: 0,
    printer_version: 0,
    compatible: name.startsWith(`${firmwarePrefix(printer.model)}_firmware_`),
    relation: RELATION[Math.sign(order) + 1] ?? 'same',
  };
}

function materialOf(tool: MockTool) {
  return {
    ...(tool.material !== '---' && {
      material_package_instance: {
        class: 'FFF',
        package: {
          class: 'FFF',
          material: {
            class: 'FFF',
            abbreviation: tool.material,
            ...(tool.color && { primary_color: { color_rgba: tool.color } }),
          },
        },
      },
    }),
  };
}

function toolInfo(printer: MockPrinter, i: number) {
  const tool = printer.tools[i];
  if (!tool || tool.absent) return null;
  return {
    type: 'FFF_PRINT_HEAD',
    features: {
      nozzle_diameter: 0.4,
      nozzle_hardened: printer.nozzle.hardened,
      nozzle_high_flow: printer.nozzle.highFlow,
      nozzle_high_temp: printer.nozzle.highTemp,
    },
    ...materialOf(tool),
  };
}

/// /api/v1/info, whose hash is its ETag and the status's info_revision.
function info(printer: MockPrinter): Ok<'/api/v1/info', 'get'> {
  return {
    hostname: printer.hostname,
    serial: 'MOCK-0000000000000000',
    nozzle_diameter: 0.4,
    mmu: printer.mmu,
    min_extrusion_temp: 170,
    ...(printer.apiV2 && {
      // The model's docks, not the tools in them.
      tool_count: printer.tools.length,
      tools: {
        ...Object.fromEntries(
          printer.tools.map((_, i) => [String(i), toolInfo(printer, i)]),
        ),
        ...(printer.mmu &&
          Object.fromEntries(
            printer.slots.map((slot, i) => [
              `0.${String(i)}`,
              { type: 'FFF_FEEDER_SLOT', ...materialOf(slot) },
            ]),
          )),
      },
      ...(printer.enclosure && {
        enclosure: { enabled: true, printing_filtration: true },
      }),
      features: [
        ...FEATURES,
        ...(printer.chamber ? ['chamber' as const] : []),
        // A heater per tool (the XL); the INDX heats the picked tool only.
        ...(printer.perToolHeating ? ['per_tool_heating' as const] : []),
        ...(printer.toolCount > 1 || printer.takesMmu
          ? (['tool_mapping', 'change_all'] as const)
          : []),
      ],
      hw_checks: {
        nozzle: printer.nozzleCheck,
        model: 'warning',
        firmware: 'warning',
        gcode_level: 'warning',
        input_shaper: 'warning',
        gcode_compatibility: 'warning',
      },
    }),
  };
}

const revision = (body: unknown) => {
  let h = 0;
  for (const c of JSON.stringify(body)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h >>> 0;
};
export function handleApi(
  printer: MockPrinter,
  req: MockRequest,
): MockResponse {
  const { method, path } = req;
  if (printer.offline) return empty(503);

  const denied = authorize(printer, req);
  if (denied) return denied;

  if (method === 'GET' && path === '/api/version') {
    const body: Ok<'/api/version', 'get'> = {
      api: '2.0.0',
      version: '2.1.2',
      printer: PRINTER_CODE[printer.model],
      text: 'PrusaLink',
      firmware: `${printer.firmware}+mock`,
      capabilities: { 'upload-by-put': true },
    };
    return json(body);
  }

  if (method === 'GET' && path === '/api/v1/info') {
    const body = info(printer);
    return cached(req, body, `"${String(revision(body))}"`);
  }

  // Firmware before API v2 compares the whole URL: a query is a 404.
  if (
    method === 'GET' &&
    path === '/api/v1/status' &&
    req.query?.includes('expanded=true') &&
    !printer.apiV2
  )
    return empty(404);

  if (method === 'GET' && path === '/api/v1/status') {
    const tool = printer.activeToolState;
    const expanded = req.query?.includes('expanded=true') ?? false;
    const body: Ok<'/api/v1/status', 'get'> = {
      storage: { path: '/usb/', name: 'usb', read_only: false },
      printer: {
        state: printer.state,
        temp_bed: printer.bed.temp,
        target_bed: printer.bed.target,
        temp_nozzle: tool.temp,
        target_nozzle: tool.target,
        axis_x: printer.axis.x,
        axis_y: printer.axis.y,
        axis_z: printer.axis.z,
        flow: printer.flow,
        speed: printer.speed,
        fan_hotend: 0,
        fan_print: printer.fanPrint,
        ...(printer.state === 'ATTENTION' &&
          printer.question && {
            status_printer: { ok: false, message: printer.question },
          }),
        ...(expanded && {
          tools: {
            ...Object.fromEntries(
              printer.tools.map((t, i) => [
                String(i),
                t.absent
                  ? null
                  : {
                      type: 'FFF_PRINT_HEAD',
                      active:
                        !printer.parked &&
                        !printer.mmu &&
                        i === printer.activeTool,
                      // Like the firmware: without a heater per tool, the one
                      // toolhead's values belong to the picked tool only.
                      ...(printer.heats(i) && {
                        nozzle_temp: t.temp,
                        nozzle_target_temp: t.target || null,
                        heatbreak_fan_rpm: t.temp > 50 ? 5200 : 0,
                        print_fan_rpm: 0,
                      }),
                    },
              ]),
            ),
            // The MMU's slots, the one feeding marked (Connect telemetry).
            ...(printer.mmu &&
              Object.fromEntries(
                printer.slots.map((_, i) => [
                  `0.${String(i)}`,
                  {
                    type: 'FFF_FEEDER_SLOT',
                    active: i === printer.activeSlot,
                  },
                ]),
              )),
          },
          z_offset: 0,
          info_revision: revision(info(printer)),
          ...(printer.chamber && {
            chamber: {
              temp: printer.chamber.temp,
              target_temp: printer.chamber.target || null,
              fan_1_rpm: 0,
              fan_2_rpm: 0,
              fan_pwm_target: 0,
              led_intensity: 100,
            },
          }),
          ...(printer.enclosure && {
            enclosure: {
              temp: printer.enclosure.temp,
              fan_rpm: 0,
              time_in_use: 12345,
            },
          }),
          ...(printer.dialog && { dialog_id: printer.dialog.id }),
          cancel_object_revision: printer.objectsRevision,
        }),
      },
      ...(printer.job && {
        job: {
          id: printer.job.id,
          progress: Math.round(printer.job.progress),
          time_remaining: printer.job.time_remaining,
          time_printing: printer.job.time_printing,
        },
      }),
    };
    return json(body);
  }

  // OctoPrint-compatible, as the firmware serves it (lib/WUI/link_content/basic_gets.cpp).
  if (method === 'GET' && path === '/api/printer') {
    const tool = printer.activeToolState;
    return json({
      telemetry: {
        'temp-bed': printer.bed.temp,
        'temp-nozzle': tool.temp,
        'print-speed': printer.speed,
        'z-height': printer.axis.z,
        material: printer.parked ? '---' : tool.material,
      },
      temperature: {
        tool0: {
          actual: tool.temp,
          target: tool.target,
          display: tool.target,
          offset: 0,
        },
        bed: {
          actual: printer.bed.temp,
          target: printer.bed.target,
          offset: 0,
        },
      },
    });
  }

  if (method === 'GET' && path === '/api/v1/storage') {
    const body: Ok<'/api/v1/storage', 'get'> = {
      storage_list: [
        {
          path: '/usb/',
          name: 'usb',
          type: 'USB',
          read_only: false,
          available: printer.usb,
        },
      ],
    };
    return json(body);
  }

  if (method === 'GET' && path === '/api/v1/job') {
    if (!printer.job) return empty(204);
    const { job } = printer;
    return json({
      id: job.id,
      state: printer.state,
      progress: Math.round(job.progress),
      time_remaining: job.time_remaining,
      time_printing: job.time_printing,
      file: {
        name: job.file.name,
        display_name: job.file.display_name,
        path: job.file.dir ? `/usb/${job.file.dir}` : '/usb',
        size: job.file.size,
        m_timestamp: job.file.m_timestamp,
        refs: fileRefs(filePath(job.file)),
      },
    });
  }

  const jobAction = /^\/api\/v1\/job\/(\d+)(?:\/(pause|resume))?$/.exec(path);
  if (jobAction && Number(jobAction[1]) === printer.job?.id) {
    // Like the firmware with a warning on its screen: pause and resume are
    // refused until it is answered (stop still goes through).
    if (method === 'PUT' && printer.question)
      return json({ title: 'Conflict', message: 'Printer is busy' }, 409);
    if (method === 'DELETE' && !jobAction[2]) {
      printer.stop();
      return empty(204);
    }
    if (method === 'PUT' && jobAction[2] === 'pause') {
      printer.pause();
      return empty(204);
    }
    if (method === 'PUT' && jobAction[2] === 'resume') {
      printer.resume();
      return empty(204);
    }
  }

  const v2 = printer.apiV2 ? handleV2(printer, req) : undefined;
  if (v2) return v2;

  if (method === 'GET' && path.startsWith('/usb/')) {
    const f = printer.file(decodeURIComponent(path.slice(5)));
    if (!f || !printer.usb) return empty(404);
    printer.header(f);
    return {
      status: 200,
      body:
        printer.bytes(f) ??
        f.gcode ??
        `; ${f.display_name}\n; mock printer, no G-code\n`,
      headers: {
        'content-type': 'application/octet-stream',
        'content-disposition': `attachment; filename="${f.display_name}"`,
      },
    };
  }

  const thumb = /^\/thumb\/([sl])\/usb\/(.+)$/.exec(path);
  if (method === 'GET' && thumb) {
    const f = printer.file(decodeURIComponent(thumb[2] ?? ''));
    // Like the firmware: `s` is an exact 16×16 picture, which PrusaSlicer's
    // XL profiles do not embed (MK4 and CORE One ones do); `l` is the large one.
    if (!f || (thumb[1] === 's' && printer.model.startsWith('XL')))
      return empty(404);
    return {
      status: 200,
      body: mockThumbnail(f.display_name, thumb[1] === 'l'),
      headers: { 'content-type': 'image/svg+xml' },
    };
  }

  if (
    !printer.usb &&
    (path.startsWith('/api/v1/files/') || path.startsWith('/thumb/'))
  ) {
    return empty(404);
  }

  const listing = /^\/api\/v1\/files\/usb(?:\/(.*?))?\/?$/.exec(path);
  if (method === 'GET' && listing) {
    const dir = decodeURIComponent(listing[1] ?? '');
    if (
      !dir ||
      printer.list(dir).files.length ||
      printer.list(dir).folders.length ||
      printer.folders.includes(dir)
    ) {
      const { files, folders } = printer.list(dir);
      const firmware = printer.apiV2 && !dir ? printer.firmwareUploads : [];
      return json({
        type: 'FOLDER',
        name: dir ? (dir.split('/').pop() ?? dir) : 'usb',
        ro: false,
        children: [
          ...folders.map((name) => ({
            type: 'FOLDER',
            name,
            display_name: name,
            ro: false,
          })),
          ...files.map((f) => ({
            type: 'PRINT_FILE',
            name: f.name,
            display_name: f.display_name,
            ro: false,
            size: f.size,
            m_timestamp: f.m_timestamp,
            refs: fileRefs(filePath(f)),
          })),
          ...firmware.map((display_name, i) => ({
            type: 'FIRMWARE',
            name: firmwareShortName(i),
            display_name,
            ro: false,
            size: 2_500_000,
            m_timestamp: 1_760_000_000,
            refs: { download: `/usb/${firmwareShortName(i)}` },
          })),
        ],
      });
    }
  }

  const fileOp = /^\/api\/v1\/files\/usb\/(.+)$/.exec(path);
  if (fileOp) {
    const name = decodeURIComponent(fileOp[1] ?? '');
    if (method === 'PUT') {
      const slash = name.lastIndexOf('/');
      // Like the firmware (gcode_upload.cpp): G-code anywhere, firmware only
      // in the root, where the printer looks for it when it starts. It does
      // not list .bbf files, so the mock does not keep them.
      if (name.toLowerCase().endsWith('.bbf')) {
        if (slash >= 0 || req.headers['print-after-upload'] === '?1')
          return empty(422);
        printer.firmwareUploads = [
          ...printer.firmwareUploads.filter((n) => n !== name),
          name,
        ];
        return empty(201);
      }
      if (!/\.(gcode|bgcode|gco|gc|g|bgc)$/i.test(name)) return empty(415);
      // Like the firmware: a taken name needs `Overwrite: ?1`.
      const taken = printer
        .list(slash < 0 ? '' : name.slice(0, slash))
        .files.some((f) => f.display_name === name.slice(slash + 1));
      if (taken && req.headers.overwrite !== '?1') return empty(409);
      const body = req.body;
      const stored = printer.upload(
        name,
        body?.length ?? 0,
        body && body.length < 1024 ? new TextDecoder().decode(body) : undefined,
        body && body.length < UPLOAD_KEPT ? new Uint8Array(body) : undefined,
      );
      if (req.headers['print-after-upload'] === '?1')
        printer.startPrint(stored);
      return empty(201);
    }
    if (method === 'POST') {
      if (!printer.file(name)) return empty(404);
      const mapping = req.body?.length
        ? (readJson(req)?.tool_mapping as Record<string, unknown> | undefined)
        : undefined;
      if (mapping !== undefined && !validMapping(printer, mapping))
        return json({ title: 'Unprocessable', text: 'Bad tool mapping' }, 422);
      return printer.startPrint(
        name,
        mapping as Record<string, number[]> | undefined,
      )
        ? empty(204)
        : empty(409);
    }
    if (method === 'DELETE') {
      return printer.delete(name) ? empty(204) : empty(409);
    }
  }

  return {
    status: 404,
    body: '404: Not Found',
    headers: { 'content-type': 'text/plain' },
  };
}

/// Like the firmware's handle_tool_mapping: each extruder (1-based) to one
/// or more enabled tools, no tool twice.
function validMapping(
  printer: MockPrinter,
  mapping: Record<string, unknown>,
): boolean {
  const used = new Set<number>();
  for (const [from, to] of Object.entries(mapping)) {
    if (!/^[1-9]\d*$/.test(from) || !Array.isArray(to) || !to.length)
      return false;
    for (const tool of to) {
      const target =
        typeof tool === 'number' ? printer.targets[tool - 1] : undefined;
      if (
        typeof tool !== 'number' ||
        !target ||
        target.tool.absent ||
        target.tool.material === '---' ||
        used.has(tool)
      )
        return false;
      used.add(tool);
    }
  }
  return true;
}

/// Uploads up to this size keep their bytes, for downloads (cancel object
/// reads the shapes from the job file).
const UPLOAD_KEPT = 32 << 20;

const firmwareShortName = (i: number) => `FIRMWA~${String(i + 1)}.BBF`;

const firmwareByShortName = (printer: MockPrinter, name: string) =>
  printer.firmwareUploads.find((_, i) => firmwareShortName(i) === name);

/// The PrusaLink 2 endpoints (doc/prusalink-api-v2.md in Buddy).
function handleV2(
  printer: MockPrinter,
  req: MockRequest,
): MockResponse | undefined {
  const { method, path } = req;
  const idle = IDLE_STATES.includes(printer.state);
  const conflict = (message: string) =>
    json({ title: 'Conflict', text: message }, 409);

  if (path === '/api/v1/dialog' && method === 'GET') {
    const d = printer.dialog;
    if (!d) return empty(204);
    return cached(
      req,
      {
        dialog_id: d.id,
        state: d.state,
        ...(d.code && { code: d.code }),
        title: d.title,
        text: d.text,
        buttons: d.buttons,
      } satisfies Ok<'/api/v1/dialog', 'get'>,
      `"${String(d.id)}"`,
    );
  }

  const press = /^\/api\/v1\/dialog\/(\d+)$/.exec(path);
  if (press && method === 'POST') {
    const button = readJson(req)?.button;
    if (typeof button !== 'string') return empty(400);
    const result = printer.press(Number(press[1]), button);
    return empty({ ok: 204, stale: 404, invalid: 400 }[result]);
  }

  const objects =
    /^\/api\/v1\/job\/(\d+)\/objects(?:\/(\d+)\/(cancel|uncancel))?$/.exec(
      path,
    );
  if (objects) {
    const job = printer.job;
    if (job?.id !== Number(objects[1])) return empty(404);
    if (method === 'GET' && !objects[2]) {
      const current = printer.currentObject;
      return cached(
        req,
        {
          ...(current !== undefined && { current }),
          objects: job.objects.map((o, id) => ({
            id,
            canceled: o.canceled,
            // Like the firmware: names of the first 16 objects only.
            ...(id < 16 && { name: o.name }),
          })),
        } satisfies Ok<'/api/v1/job/{id}/objects', 'get'>,
        `"${String(printer.objectsRevision)}"`,
      );
    }
    if (method === 'PUT' && objects[2]) {
      if (printer.state !== 'PRINTING' && printer.state !== 'PAUSED')
        return conflict('Not printing');
      // Like the firmware, the answer waits until Marlin takes the request.
      return printer.setCanceled(Number(objects[2]), objects[3] === 'cancel')
        ? { status: 204, delayMs: 300 + Math.round(Math.random() * 1200) }
        : empty(404);
    }
  }

  if (path === '/api/v1/printer' && method === 'PUT') {
    const body = readJson(req);
    if (!body) return empty(400);
    const printing = printer.state === 'PRINTING' || printer.state === 'PAUSED';
    const apply: (() => void)[] = [];
    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== 'number') return empty(422);
      const tool = /^tools\.(\d+)\.nozzle_target_temp$/.exec(key);
      const t = tool ? printer.tools[Number(tool[1])] : undefined;
      if (t && !printer.heats(Number(tool?.[1])))
        return conflict('Only the picked tool is heated');
      if (t) apply.push(() => (t.target = value));
      else if (key === 'speed') apply.push(() => (printer.speed = value));
      else if (key === 'flow') apply.push(() => (printer.flow = value));
      else if (key === 'fan_print')
        apply.push(() => (printer.fanPrint = value));
      else if (key === 'target_bed')
        apply.push(() => (printer.bed.target = value));
      else if (key === 'chamber.target_temp' && printer.chamber) {
        const chamber = printer.chamber;
        apply.push(() => (chamber.target = value));
      } else if (key === 'z_offset_delta') {
        if (!printing) return conflict('Babysteps only while printing');
        if (Math.abs(value) > 2) return empty(422);
        apply.push(
          () =>
            (printer.zOffset =
              Math.round((printer.zOffset + value) * 1000) / 1000),
        );
      } else return empty(422);
    }
    for (const f of apply) f();
    return empty(204);
  }

  if (path === '/api/v1/printer/preheat' && method === 'POST') {
    const body = readJson(req);
    if (!body || !('filament' in body)) return empty(400);
    if (!idle) return conflict('Printer is busy');
    const { filament, tool } = body;
    if (filament !== null && !FILAMENTS.some((f) => f.name === filament))
      return empty(422);
    if (typeof tool === 'number' && !printer.heats(tool))
      return conflict('Only the picked tool is heated');
    printer.preheat(
      typeof filament === 'string' ? filament : undefined,
      typeof tool === 'number' ? tool : undefined,
    );
    return empty(204);
  }

  if (path === '/api/v1/filaments' && method === 'GET') {
    return json({
      filaments: FILAMENTS.map((f) => ({
        name: f.name,
        properties: {
          min_print_temperature: f.nozzle,
          max_print_temperature: f.nozzle,
          preheat_temperature: f.preheat,
          min_bed_temperature: f.bed,
          max_bed_temperature: f.bed,
          ...(f.chamber && { chamber_temperature: f.chamber }),
        },
      })),
    } satisfies Ok<'/api/v1/filaments', 'get'>);
  }

  if (path === '/api/v1/filament/change-all') {
    // The firmware suggests only on its print preview's tools mapping
    // screen, which the mock does not have.
    if (method === 'GET') return conflict('Not on the print preview');
    if (method === 'POST') {
      if (!idle) return conflict('Printer is busy');
      const items = readJson(req)?.items as
        | Record<string, { action?: string; filament?: string; color?: string }>
        | undefined;
      if (!items) return empty(400);
      const changes: Change[] = [];
      for (const [id, item] of Object.entries(items)) {
        const tool = printer.targets.find((t) => t.id === id)?.tool;
        if (!tool) return empty(422);
        if (item.action === 'unload') changes.push({ tool, material: '---' });
        else if (item.action === 'change') {
          const name = item.filament;
          if (!name || !FILAMENTS.some((f) => f.name === name))
            return empty(422);
          changes.push({ tool, material: name, color: item.color });
        } else if (item.action !== 'keep') return empty(422);
      }
      printer.changeFilaments(changes);
      return empty(202);
    }
  }

  const toolFilament = /^\/api\/v1\/tools\/(\d+)\/filament$/.exec(path);
  if (toolFilament && (method === 'POST' || method === 'PUT')) {
    const tool = Number(toolFilament[1]);
    const t = printer.tools[tool];
    const body = readJson(req);
    if (!t || t.absent || !body) return empty(t && !t.absent ? 400 : 404);
    const material = body.material as
      { material_type?: unknown; primary_color?: unknown } | undefined;
    const type = material?.material_type;
    const color =
      typeof material?.primary_color === 'string'
        ? material.primary_color
        : undefined;
    const known =
      typeof type === 'string' && FILAMENTS.some((f) => f.name === type);
    if (method === 'PUT') {
      if (!known || t.material === '---') return empty(422);
      t.material = type;
      t.color = color;
      return empty(202);
    }
    const command = body.command;
    if (command === 'unload') {
      if (!idle) return conflict('Printer is busy');
      printer.toolFilament(tool, '---');
      return empty(202);
    }
    if (command !== 'load' && command !== 'change') return empty(400);
    if (!known) return empty(422);
    const printing = printer.state === 'PRINTING' || printer.state === 'PAUSED';
    if (command === 'load' ? !idle : !printing && !idle)
      return conflict('Printer is busy');
    printer.toolFilament(tool, type, color);
    return empty(202);
  }

  const fw = /^\/api\/v1\/files\/usb\/([^/]+\.bbf)$/i.exec(path);
  const fwName =
    fw && firmwareByShortName(printer, decodeURIComponent(fw[1] ?? ''));
  if (fw && fwName) {
    const meta = firmwareMeta(printer, fwName);
    if (method === 'GET')
      return json({
        type: 'FIRMWARE',
        name: decodeURIComponent(fw[1] ?? ''),
        display_name: fwName,
        read_only: false,
        m_timestamp: 1_760_000_000,
        size: 2_500_000,
        meta,
      });
    if (method === 'POST') {
      if (!idle) return conflict('Printer is busy');
      if (!meta.compatible) return empty(422);
      if (meta.relation !== 'newer')
        return json(
          {
            reason: 'not_newer',
            installed: `${printer.firmware}+mock`,
            file: meta.version,
          },
          409,
        );
      printer.flash(meta.version);
      return empty(202);
    }
    if (method === 'DELETE') {
      printer.firmwareUploads = printer.firmwareUploads.filter(
        (n) => n !== fwName,
      );
      return empty(204);
    }
  }
  return undefined;
}

function fileRefs(name: string) {
  return {
    icon: `/thumb/s/usb/${name}`,
    thumbnail: `/thumb/l/usb/${name}`,
    download: `/usb/${name}`,
  };
}

const REALM = 'Printer API';

/// The firmware's rules (lib/WUI/nhttp/req_parser.cpp): every /api call needs
/// the password, as X-Api-Key or as HTTP Digest for user "maker". A wrong
/// X-Api-Key is refused with an ApiKey challenge, which browsers do not prompt
/// for; a request without one gets a Digest challenge, which they do. The mock
/// accepts only X-Api-Key.
function authorize(
  printer: MockPrinter,
  req: MockRequest,
): MockResponse | undefined {
  const key = req.headers['x-api-key'];
  if (key === printer.apiKey) return undefined;
  const challenge =
    key === undefined
      ? `Digest realm="${REALM}", nonce="0000000000000000", stale=false`
      : `ApiKey realm="${REALM}"`;
  return {
    status: 401,
    body: '401: Unauthorized',
    headers: { 'content-type': 'text/plain', 'www-authenticate': challenge },
  };
}
