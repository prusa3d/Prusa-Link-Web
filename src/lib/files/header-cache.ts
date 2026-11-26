import type { Header } from './header';

/// File headers by the file's place on the printer (`dir/long name`): read
/// from the file itself on upload, or downloaded once. Kept in the tab's
/// session too, so a reload does not download them again.
const STORE = 'prusalink.header:';
const memory = new Map<string, Header>();

export const fileKey = (dir: string, name: string) =>
  dir ? `${dir}/${name}` : name;

export function rememberHeader(key: string, header: Header) {
  memory.set(key, header);
  try {
    globalThis.sessionStorage.setItem(STORE + key, JSON.stringify(header));
  } catch {
    // Too large for the session, or no storage: kept in memory only.
  }
}

export function knownHeader(key: string): Header | undefined {
  let header = memory.get(key);
  if (!header) {
    try {
      const saved = globalThis.sessionStorage.getItem(STORE + key);
      header = saved ? (JSON.parse(saved) as Header) : undefined;
    } catch {
      header = undefined;
    }
    if (header) memory.set(key, header);
  }
  return header;
}
