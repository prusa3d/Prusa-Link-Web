import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { strFromU8, unzipSync } from 'fflate';
import { afterEach, describe, expect, it } from 'vitest';

import { manifestOf, readDist, VARIANT_FILES, zipPackage } from './package.ts';
import { releaseVersion } from './version.ts';

let dir: string | undefined;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

function fakeDist(variants: string[]) {
  dir = mkdtempSync(join(tmpdir(), 'prusalink-package-'));
  for (const variant of variants) {
    mkdirSync(join(dir, variant));
    for (const file of VARIANT_FILES)
      writeFileSync(join(dir, variant, file), `${variant}:${file}`);
  }
  return new URL(`${pathToFileURL(dir).href}/`);
}

describe('release package', () => {
  it('lists every file of every variant with its size and hash', () => {
    const files = readDist(fakeDist(['xl', 'generic']));
    const manifest = manifestOf(files, '2.0.0', 'abc123');
    expect(manifest.version).toBe('2.0.0');
    expect(manifest.commit).toBe('abc123');
    expect(Object.keys(manifest.variants)).toEqual(['generic', 'xl']);
    const gz = manifest.variants.xl?.files['index.html.gz'];
    expect(gz).toEqual({
      size: 'xl:index.html.gz'.length,
      sha256: createHash('sha256').update('xl:index.html.gz').digest('hex'),
    });
    expect(Object.keys(manifest.variants.generic?.files ?? {}).sort()).toEqual(
      [...VARIANT_FILES].sort(),
    );
  });

  it('zips everything under prusalink-web/', () => {
    const files = readDist(fakeDist(['mk4']));
    const manifest = manifestOf(files, '2.0.0', 'abc123');
    const zip = unzipSync(
      zipPackage(
        files,
        { 'serve.mjs': new TextEncoder().encode('serve') },
        manifest,
      ),
    );
    expect(Object.keys(zip).sort()).toEqual([
      'prusalink-web/manifest.json',
      'prusalink-web/mk4/favicon.ico',
      'prusalink-web/mk4/favicon.ico.gz',
      'prusalink-web/mk4/index.html',
      'prusalink-web/mk4/index.html.gz',
      'prusalink-web/serve.mjs',
    ]);
    const inZip = zip['prusalink-web/manifest.json'];
    expect(JSON.parse(strFromU8(inZip ?? new Uint8Array()))).toEqual(manifest);
  });

  it('fails without builds', () => {
    expect(() => readDist(fakeDist([]))).toThrow(/No builds/);
  });
});

describe('release version', () => {
  it('is the tag without its v', () => {
    expect(releaseVersion({ PRUSALINK_VERSION: 'v2.0.0' })).toBe('2.0.0');
    expect(releaseVersion({ PRUSALINK_VERSION: '2.1.0-rc1' })).toBe(
      '2.1.0-rc1',
    );
  });

  it('is marked -dev for a local build', () => {
    expect(releaseVersion({})).toMatch(/-dev$/);
  });
});
