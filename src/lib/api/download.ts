import { session } from '../auth/session.svelte';
import { readObjectsInfo, type PlateObject } from '../files/objects-info';
import { Priority, queued } from './queue.svelte';

/// The object outlines of a file on the printer, streamed from its download
/// (`/usb/…`) and cancelled once read: only the file's head travels. Waits
/// behind everything else, and gives way to what a person does.
export function downloadObjects(
  path: string,
): Promise<PlateObject[] | undefined> {
  return queued(async (signal) => {
    const headers: Record<string, string> = {};
    if (session.key) headers['X-Api-Key'] = session.key;
    const res = await fetch(path, { headers, signal });
    return res.ok && res.body ? readObjectsInfo(res.body) : undefined;
  }, Priority.Background).catch(() => undefined);
}
