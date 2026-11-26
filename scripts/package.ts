import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { zipSync, type Zippable } from 'fflate';

import { releaseVersion } from './version.ts';

// The release zip the Buddy firmware downloads. Its layout is a contract with
// the firmware's update script: prusalink-web/<variant>/<file> for every
// dist/ folder, serve.mjs, README.md and manifest.json beside them.

export const TOP = 'prusalink-web';
export const VARIANT_FILES = [
  'index.html',
  'index.html.gz',
  'favicon.ico',
  'favicon.ico.gz',
] as const;

export interface Manifest {
  version: string;
  commit: string;
  variants: Record<
    string,
    { files: Record<string, { size: number; sha256: string }> }
  >;
}

const sha256 = (data: Uint8Array) =>
  createHash('sha256').update(data).digest('hex');

/// Every variant's files, read from `dist`, keyed by `<variant>/<file>`.
export function readDist(dist: URL): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  const variants = readdirSync(dist, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  if (!variants.length) throw new Error(`No builds in ${dist.pathname}`);
  for (const variant of variants)
    for (const file of VARIANT_FILES)
      files.set(
        `${variant}/${file}`,
        readFileSync(new URL(`${variant}/${file}`, dist)),
      );
  return files;
}

export function manifestOf(
  files: Map<string, Uint8Array>,
  version: string,
  commit: string,
): Manifest {
  const variants: Manifest['variants'] = {};
  // By code point, not locale: `coreone/` before `coreone_indx/`.
  const byPath = [...files].sort(([a], [b]) => Number(a > b) - Number(a < b));
  for (const [path, data] of byPath) {
    const [variant = '', file = ''] = path.split('/');
    (variants[variant] ??= { files: {} }).files[file] = {
      size: data.length,
      sha256: sha256(data),
    };
  }
  return { version, commit, variants };
}

/// The zip's bytes. Fixed timestamps, so the same input zips the same.
export function zipPackage(
  files: Map<string, Uint8Array>,
  extras: Record<string, Uint8Array>,
  manifest: Manifest,
): Uint8Array {
  const mtime = new Date('2000-01-01T00:00:00Z');
  const tree: Zippable = {};
  const put = (path: string, data: Uint8Array) => {
    tree[`${TOP}/${path}`] = [data, { mtime }];
  };
  for (const [path, data] of files) put(path, data);
  for (const [path, data] of Object.entries(extras)) put(path, data);
  put(
    'manifest.json',
    new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`),
  );
  return zipSync(tree, { level: 9 });
}

function commitSha(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = new URL('../', import.meta.url);
  const version = releaseVersion();
  const files = readDist(new URL('dist/', root));
  const manifest = manifestOf(files, version, commitSha());
  const zip = zipPackage(
    files,
    {
      'serve.mjs': readFileSync(new URL('scripts/serve.mjs', root)),
      'README.md': readFileSync(new URL('scripts/share/README.md', root)),
    },
    manifest,
  );
  const share = new URL('share/', root);
  mkdirSync(share, { recursive: true });
  const name = `${TOP}-${version}.zip`;
  writeFileSync(new URL(name, share), zip);
  console.log(`share/${name}`);
}
