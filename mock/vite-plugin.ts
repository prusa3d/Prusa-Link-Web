import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect, Plugin, ProxyOptions } from 'vite';

import { handleApi } from './api.ts';
import {
  MockPrinter,
  PRINTER_CODE,
  type PrinterModel,
  type PrinterState,
} from './printer.ts';

export interface DevPrinterOptions {
  /// A real printer or a MINI404 simulator. Unset: the in-process mock answers.
  printerUrl?: string | undefined;
}

const API_PREFIXES = ['/api', '/thumb', '/usb'];

export interface MockPatch {
  /// Back to the seeded state of the current model.
  reset?: boolean;
  usb?: boolean;
  firmware?: string;
  /// Simulated seconds per real second.
  timeScale?: number;
  model?: PrinterModel;
  state?: PrinterState;
  startPrint?: string;
  tool?: { index: number; temp?: number; target?: number; material?: string };
  /// A toolchanger with no tool picked.
  parked?: boolean;
  bed?: { temp?: number; target?: number };
  /// What the printer asks on its screen; null clears it.
  question?: string | null;
  /// The printer stops answering (it lost Wi-Fi, or was switched off).
  offline?: boolean;
  /// A person at the printer during a filament change.
  filament?: 'removed' | 'inserted' | 'cancel';
  /// Seconds the printer takes to pause, resume or stop.
  transitionSeconds?: number;
}

/// Dev-server only. Either proxies the printer API to `printerUrl`, or answers
/// it from a MockPrinter that the dev panel (/dev/panel.html) drives through
/// /__mock/state.
export function devPrinter(options: DevPrinterOptions = {}): Plugin {
  const printer = new MockPrinter();

  return {
    name: 'prusalink-dev-printer',
    apply: 'serve',

    config() {
      if (!options.printerUrl) return;
      const target: ProxyOptions = {
        target: options.printerUrl,
        changeOrigin: true,
      };
      return {
        server: {
          proxy: Object.fromEntries(API_PREFIXES.map((p) => [p, target])),
        },
      };
    },

    // The mock printer drawer, on the app's own page in the dev server only.
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (options.printerUrl || !ctx.server || ctx.path !== '/index.html')
          return html;
        return html.replace(
          '</body>',
          '<script type="module" src="/dev/drawer.ts"></script></body>',
        );
      },
    },

    configureServer(server) {
      if (options.printerUrl) {
        server.config.logger.info(
          `  ➜  Printer: ${options.printerUrl} (proxied)`,
        );
        return;
      }
      server.config.logger.info(
        '  ➜  Printer: mock (dev panel at /dev/panel.html)',
      );
      const clock = setInterval(() => {
        printer.tick();
      }, 1000).unref();
      server.httpServer?.once('close', () => {
        clearInterval(clock);
      });

      server.middlewares.use('/__mock/state', handler(printer, serveMockState));
      server.middlewares.use(handler(printer, serveApi));
    },
  };
}

type Handler = (
  printer: MockPrinter,
  req: IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction,
) => Promise<void>;

function handler(
  printer: MockPrinter,
  fn: Handler,
): Connect.NextHandleFunction {
  return (req, res, next) => {
    fn(printer, req, res, next).catch(next);
  };
}

const serveMockState: Handler = async (printer, req, res) => {
  if (req.method === 'PATCH') {
    const text = (await readBody(req)).toString();
    applyPatch(printer, (text ? JSON.parse(text) : {}) as MockPatch);
  }
  send(res, 200, snapshot(printer));
};

const serveApi: Handler = async (printer, req, res, next) => {
  const path = (req.url ?? '').split('?')[0] ?? '';
  if (!path.startsWith('/api/') && !path.startsWith('/thumb/')) {
    next();
    return;
  }
  const out = handleApi(printer, {
    method: req.method ?? 'GET',
    path,
    headers: req.headers,
    body: await readBody(req),
  });
  send(res, out.status, out.body, out.headers);
};

function applyPatch(printer: MockPrinter, patch: MockPatch) {
  if (patch.reset) printer.reset();
  if (patch.usb !== undefined) printer.usb = patch.usb;
  if (patch.firmware) printer.firmware = patch.firmware;
  if (patch.timeScale) printer.timeScale = patch.timeScale;
  // Only the models the mock has data for; another one would crash reset().
  if (patch.model && patch.model in PRINTER_CODE) printer.setModel(patch.model);
  if (patch.state) printer.state = patch.state;
  if (patch.startPrint) printer.startPrint(patch.startPrint);
  if (patch.tool) {
    const tool = printer.tools[patch.tool.index];
    if (tool) Object.assign(tool, patch.tool);
  }
  if (patch.parked !== undefined) printer.parked = patch.parked;
  if (patch.bed) Object.assign(printer.bed, patch.bed);
  if (patch.question !== undefined)
    printer.question = patch.question ?? undefined;
  if (patch.offline !== undefined) printer.offline = patch.offline;
  if (patch.filament) printer.answer(patch.filament);
  if (patch.transitionSeconds !== undefined)
    printer.transitionSeconds = patch.transitionSeconds;
}

function snapshot(printer: MockPrinter) {
  return {
    apiKey: printer.apiKey,
    timeScale: printer.timeScale,
    usb: printer.usb,
    firmware: printer.firmware,
    model: printer.model,
    parked: printer.parked,
    state: printer.state,
    bed: printer.bed,
    tools: printer.tools,
    activeTool: printer.activeTool,
    files: printer.files,
    job: printer.job,
    question: printer.question,
    filamentStep: printer.filamentStep,
  };
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      chunks.push(c);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

function send(
  res: ServerResponse,
  status: number,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  if (body === undefined) {
    res.writeHead(status, headers).end();
  } else if (typeof body === 'string') {
    res
      .writeHead(status, { 'content-type': 'text/plain', ...headers })
      .end(body);
  } else {
    res
      .writeHead(status, { 'content-type': 'application/json', ...headers })
      .end(JSON.stringify(body));
  }
}
