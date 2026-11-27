import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import type { Plugin } from 'vite';

import { PRINTER_IMAGES } from '../../mock/printer-images.ts';
import { listPictures, type PrinterPicture } from './printers.ts';
import {
  AREAS,
  parseStatus,
  without,
  resolveVariant,
  serializeStatus,
} from './status.ts';

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
    // Saving a status picture must not reload the editor that saved it.
    config: () => ({
      server: { watch: { ignored: ['**/assets/printers/status/**'] } },
    }),
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
  const pictures = await pictureList();
  if (kind === 'printers' && req.method === 'GET') {
    json(
      res,
      200,
      pictures.map((p) => ({
        ...p,
        hasStatus: existsSync(`${STATUS}${p.name}.json`),
      })),
    );
    return;
  }
  if (!NAME.test(name) || !existsSync(`${PRINTERS}${name}.svg`)) {
    json(res, 404, { error: 'No such printer picture' });
    return;
  }
  const base = pictures.find((p) => p.name === name)?.base;
  if (kind === 'picture' && req.method === 'GET') {
    const status = await readStatus(name);
    json(res, 200, {
      base: base ?? null,
      baseStatus: base ? await readStatus(base) : null,
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
    await writeFile(`${STATUS}${name}.json`, await formatJson(body.status));
    const updated = await updateVariants(
      name,
      pictures.filter((p) => p.base === name).map((p) => p.name),
      body.status,
    );
    json(res, 200, {
      variants: updated,
      svg: `assets/printers/status/${name}.svg`,
      json: `assets/printers/status/${name}.json`,
    });
    return;
  }
  json(res, 405, { error: 'Unsupported' });
}

async function pictureList(): Promise<PrinterPicture[]> {
  const names = (await readdir(PRINTERS))
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.slice(0, -4));
  const models = Object.values(PRINTER_IMAGES).map((f) => f.slice(0, -4));
  return listPictures(names, models);
}

async function readStatus(name: string): Promise<string | null> {
  return existsSync(`${STATUS}${name}.json`)
    ? readFile(`${STATUS}${name}.json`, 'utf8')
    : null;
}

/// Variants carry their base's labels, areas and fans resolved, so the app
/// needs no merge; a saved base refreshes them.
async function updateVariants(
  base: string,
  variants: string[],
  baseText: string,
): Promise<string[]> {
  const fresh = parseStatus(baseText);
  const done: string[] = [];
  for (const name of variants) {
    const text = await readStatus(name);
    if (!text) continue;
    const variant = parseStatus(text);
    if (variant.base !== base) continue;
    const resolved = resolveVariant(fresh, variant.overrides ?? { labels: {} });
    let next = { ...variant, ...resolved };
    for (const a of [...AREAS, 'fans' as const])
      if (!resolved[a]) next = without(next, a);
    await writeFile(
      `${STATUS}${name}.json`,
      await formatJson(serializeStatus(next)),
    );
    done.push(name);
  }
  return done;
}

/// The repository's Prettier style, so `pnpm format:check` passes on saved
/// status files.
async function formatJson(text: string): Promise<string> {
  const filepath = `${STATUS}status.json`;
  return format(text, { ...(await resolveConfig(filepath)), filepath });
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
