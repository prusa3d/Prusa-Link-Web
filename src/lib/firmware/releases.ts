import type { Variant } from '../printer/models';

/// Newer firmware from the public GitHub releases of Prusa-Firmware-Buddy.
/// The browser asks GitHub directly (the printer may have no internet).
/// GitHub serves release files without CORS headers, so the app cannot fetch
/// a .bbf to upload it; it links to the file and says what to do with it.

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
