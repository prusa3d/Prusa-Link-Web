import { session } from '../auth/session.svelte';
import { knownHeader, rememberHeader } from '../files/header-cache';
import { readHeader, type Header } from '../files/header';
import { Priority, queued } from './queue.svelte';

/// The header of a file on the USB drive (`dir/NAME~1.BGC`), kept under
/// `key`: from this page's own upload or an earlier read, else streamed
/// from the printer's download and cancelled once read, so only the file's
/// head travels. Waits behind everything else, and gives way to what a
/// person does.
export async function fileHeader(
  path: string,
  key: string,
): Promise<Header | undefined> {
  const known = knownHeader(key);
  if (known) return known;
  const header = await queued(async (signal) => {
    const headers: Record<string, string> = {};
    if (session.key) headers['X-Api-Key'] = session.key;
    const url = `/usb/${path.split('/').map(encodeURIComponent).join('/')}`;
    const res = await fetch(url, { headers, signal });
    return res.ok && res.body ? readHeader(res.body) : undefined;
  }, Priority.Background).catch(() => undefined);
  if (header) rememberHeader(key, header);
  return header;
}
