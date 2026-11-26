import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect, Plugin, ProxyOptions } from 'vite';

import { handleApi } from './api.ts';
import { applyPatch, type MockPatch, snapshot } from './control.ts';
import { MockPrinter } from './printer.ts';

export interface DevPrinterOptions {
  /// A real printer or a MINI404 simulator. Unset: the in-process mock answers.
  printerUrl?: string | undefined;
}

const API_PREFIXES = ['/api', '/thumb', '/usb'];

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
