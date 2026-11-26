import type { paths } from '../src/lib/api/schema';
import { filePath, PRINTER_CODE, type MockPrinter } from './printer.ts';
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
}

export interface MockRequest {
  method: string;
  path: string;
  body?: Buffer;
  headers: Record<string, string | string[] | undefined>;
}

const json = (body: unknown, status = 200): MockResponse => ({ status, body });
const empty = (status: number): MockResponse => ({ status });

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
    const body: Ok<'/api/v1/info', 'get'> = {
      hostname: printer.hostname,
      serial: 'MOCK-0000000000000000',
      nozzle_diameter: 0.4,
      mmu: false,
      min_extrusion_temp: 170,
    };
    return json(body);
  }

  if (method === 'GET' && path === '/api/v1/status') {
    const tool = printer.activeToolState;
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
        fan_print: 0,
        ...(printer.state === 'ATTENTION' &&
          printer.question && {
            status_printer: { ok: false, message: printer.question },
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
        ],
      });
    }
  }

  const fileOp = /^\/api\/v1\/files\/usb\/(.+)$/.exec(path);
  if (fileOp) {
    const name = decodeURIComponent(fileOp[1] ?? '');
    if (method === 'PUT') {
      // Like the firmware: a taken name needs `Overwrite: ?1`.
      const slash = name.lastIndexOf('/');
      const taken = printer
        .list(slash < 0 ? '' : name.slice(0, slash))
        .files.some((f) => f.display_name === name.slice(slash + 1));
      if (taken && req.headers.overwrite !== '?1') return empty(409);
      const body = req.body;
      const stored = printer.upload(
        name,
        body?.length ?? 0,
        body && body.length < 1024 ? body.toString() : undefined,
      );
      if (req.headers['print-after-upload'] === '?1')
        printer.startPrint(stored);
      return empty(201);
    }
    if (method === 'POST') {
      if (!printer.file(name)) return empty(404);
      return printer.startPrint(name) ? empty(204) : empty(409);
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
