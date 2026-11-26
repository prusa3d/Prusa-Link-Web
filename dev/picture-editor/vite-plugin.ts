import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const PRINTERS = fileURLToPath(
  new URL('../../assets/printers/', import.meta.url),
);
const STATUS = `${PRINTERS}status/`;
const NAME = /^[a-z0-9_-]+$/;

/// Dev-server only: lists the printer pictures and reads and writes their
/// status pictures (assets/printers/status/) for /dev/picture-editor/.
export function pictureEditor(): Plugin {
  return {
    name: 'prusalink-picture-editor',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__picture-editor', (req, res, next) => {
        route(req, res).catch(next);
      });
    },
  };
}

async function route(req: IncomingMessage, res: ServerResponse) {
  const [, kind = '', name = ''] =
    (req.url ?? '').split('?')[0]?.split('/') ?? [];
  if (kind === 'printers' && req.method === 'GET') {
    const names = (await readdir(PRINTERS))
      .filter((f) => f.endsWith('.svg'))
      .map((f) => f.slice(0, -4))
      .sort();
    json(
      res,
      200,
      names.map((n) => ({
        name: n,
        hasStatus: existsSync(`${STATUS}${n}.json`),
      })),
    );
    return;
  }
  if (!NAME.test(name) || !existsSync(`${PRINTERS}${name}.svg`)) {
    json(res, 404, { error: 'No such printer picture' });
    return;
  }
  if (kind === 'picture' && req.method === 'GET') {
    const status = existsSync(`${STATUS}${name}.json`)
      ? await readFile(`${STATUS}${name}.json`, 'utf8')
      : null;
    json(res, 200, {
      source: await readFile(`${PRINTERS}${name}.svg`, 'utf8'),
      status,
      statusSvg: existsSync(`${STATUS}${name}.svg`)
        ? await readFile(`${STATUS}${name}.svg`, 'utf8')
        : null,
    });
    return;
  }
  if (kind === 'picture' && req.method === 'PUT') {
    const body = JSON.parse((await readBody(req)).toString()) as {
      svg?: unknown;
      status?: unknown;
    };
    if (typeof body.svg !== 'string' || typeof body.status !== 'string') {
      json(res, 400, { error: 'svg and status are strings' });
      return;
    }
    JSON.parse(body.status);
    await mkdir(STATUS, { recursive: true });
    await writeFile(`${STATUS}${name}.svg`, body.svg);
    await writeFile(`${STATUS}${name}.json`, body.status);
    json(res, 200, {
      svg: `assets/printers/status/${name}.svg`,
      json: `assets/printers/status/${name}.json`,
    });
    return;
  }
  json(res, 405, { error: 'Unsupported' });
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

function json(res: ServerResponse, status: number, body: unknown) {
  res
    .writeHead(status, { 'content-type': 'application/json' })
    .end(JSON.stringify(body));
}
