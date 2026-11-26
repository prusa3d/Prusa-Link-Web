import type { Variant } from '../printer/models';

/// Newer firmware from the public GitHub releases of Prusa-Firmware-Buddy.
/// The browser asks GitHub directly (the printer may have no internet).
/// GitHub serves release files without CORS headers, so the app fetches the
/// .bbf through a Prusa mirror that sends them; when that fails, the person
/// downloads the file from GitHub and hands it to the page.

const LATEST =
  'https://api.github.com/repos/prusa3d/Prusa-Firmware-Buddy/releases/latest';
const CACHE = 'prusalink.firmware-release';

/// Release file name prefix per build, e.g. `XL_XL+_firmware_8.0.2.bbf`.
const ASSET_PREFIX: Partial<Record<Variant, string>> = {
  mk35: 'MK3.5_MK3.5S',
  mk4: 'MK4_MK4S_MK3.9_MK3.9S',
  xl: 'XL_XL+',
  coreone: 'COREONE_COREONE+GEN2',
  coreone_indx: 'COREONE_COREONE+GEN2_INDX',
  coreonel: 'COREONEL_COREONEL+',
  coreonel_indx: 'COREONEL_COREONEL+_INDX',
};

const GITHUB_DOWNLOAD =
  'https://github.com/prusa3d/Prusa-Firmware-Buddy/releases/download/';
const MIRROR_DOWNLOAD =
  'https://assets.prusa3d.com/firmware/Prusa-Firmware-Buddy/releases/download/';

/// Where the page itself can fetch a release file (one with CORS headers), or
/// undefined when there is no such copy.
export function fetchableUrl(url: string): string | undefined {
  return url.startsWith(GITHUB_DOWNLOAD)
    ? MIRROR_DOWNLOAD + url.slice(GITHUB_DOWNLOAD.length)
    : undefined;
}

export function isFirmware(name: string): boolean {
  return name.toLowerCase().endsWith('.bbf');
}

/// `XL_XL+_firmware_8.0.3_beta.bbf` → `8.0.3_beta`.
export function fileVersion(name: string): string | undefined {
  return /_firmware_(.+)\.bbf$/i.exec(name)?.[1];
}

export type FileCheck =
  | { ok: true; version: string | undefined; otherVersion: boolean }
  | { ok: false; reason: 'notFirmware' | 'otherPrinter' };

/// Whether a picked file can go to this printer: a .bbf of another printer
/// model is refused by its name; another version of this printer's file is
/// allowed (`otherVersion`).
export function checkFile(
  name: string,
  variant: Variant | undefined,
  offered: string | undefined,
): FileCheck {
  if (!isFirmware(name)) return { ok: false, reason: 'notFirmware' };
  const prefix = variant && ASSET_PREFIX[variant];
  if (prefix && !name.startsWith(`${prefix}_firmware_`))
    return { ok: false, reason: 'otherPrinter' };
  const version = fileVersion(name);
  const a = parseVersion(version);
  const b = parseVersion(offered);
  const otherVersion =
    offered !== undefined && (!a || !b || a.some((n, i) => n !== b[i]));
  return { ok: true, version: otherVersion ? version : offered, otherVersion };
}

/// Downloads a release file, reporting progress from 0 to 1 when the size is
/// known. Throws when it cannot (network, CORS, HTTP error, abort).
export async function downloadFile(
  url: string,
  name: string,
  onprogress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<File> {
  const res = await fetch(url, signal ? { signal } : {});
  if (!res.ok || !res.body) throw new Error(`HTTP ${String(res.status)}`);
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total) onprogress(Math.min(1, loaded / total));
  }
  return new File(chunks as BlobPart[], name, {
    type: 'application/octet-stream',
  });
}

export interface Release {
  version: string;
  notes: string;
  assets: { name: string; url: string }[];
}

export interface Update {
  version: string;
  notes: string;
  /// The file for this printer, when the release has exactly one.
  file?: { name: string; url: string } | undefined;
}

/// `8.0.2+17092`, `v8.0.2`, `6.2.0-RC1` → [8, 0, 2]; anything else undefined.
export function parseVersion(
  text: string | undefined,
): [number, number, number] | undefined {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(text ?? '');
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : undefined;
}

export function isNewer(candidate: string, current: string): boolean {
  const a = parseVersion(candidate);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

export function updateFor(
  release: Release,
  current: string,
  variant: Variant | undefined,
): Update | undefined {
  if (!isNewer(release.version, current)) return undefined;
  const prefix = variant && ASSET_PREFIX[variant];
  const file = prefix
    ? release.assets.find((a) => a.name.startsWith(`${prefix}_firmware_`))
    : undefined;
  return {
    version: release.version.replace(/^v/, ''),
    notes: release.notes,
    file,
  };
}

/// The latest stable release, cached for the browser session.
export async function latestRelease(): Promise<Release | undefined> {
  try {
    const cached = globalThis.sessionStorage.getItem(CACHE);
    if (cached) return JSON.parse(cached) as Release;
  } catch {
    // No cache.
  }
  try {
    const res = await fetch(LATEST, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      tag_name: string;
      html_url: string;
      assets: { name: string; browser_download_url: string }[];
    };
    const release: Release = {
      version: data.tag_name,
      notes: data.html_url,
      assets: data.assets.map((a) => ({
        name: a.name,
        url: a.browser_download_url,
      })),
    };
    try {
      globalThis.sessionStorage.setItem(CACHE, JSON.stringify(release));
    } catch {
      // Not cached.
    }
    return release;
  } catch {
    return undefined;
  }
}
