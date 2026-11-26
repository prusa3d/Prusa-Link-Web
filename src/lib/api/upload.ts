import { session } from '../auth/session.svelte';
import { Priority, queued } from './queue.svelte';

/// Uploads a file to the printer's USB stick, into `dir` ('' for the root),
/// reporting progress from 0 to 1. XMLHttpRequest because fetch reports no
/// upload progress, and a large bgcode takes minutes over printer Wi-Fi. The
/// body is the raw bytes (the spec's PUT /api/v1/files/{storage}/{path}).
export async function uploadToUsb(
  file: File,
  dir: string,
  onprogress: (fraction: number) => void,
  signal?: AbortSignal,
  overwrite = true,
): Promise<boolean> {
  const status = await putToUsb(file, dir, onprogress, signal, overwrite);
  return status >= 200 && status < 300;
}

/// uploadToUsb with the printer's answer: its HTTP status, or 0 when there was
/// none (network error, cancelled).
export function putToUsb(
  file: File,
  dir: string,
  onprogress: (fraction: number) => void,
  signal?: AbortSignal,
  overwrite = true,
): Promise<number> {
  const path = [...(dir ? dir.split('/') : []), file.name]
    .map(encodeURIComponent)
    .join('/');
  // The upload holds the printer's one request slot (queue.ts) until done:
  // polling waits, and the printer is busy receiving anyway.
  return queued(
    () =>
      new Promise<number>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', `/api/v1/files/usb/${path}`);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        // Without it the printer answers 409 when the name is taken.
        xhr.setRequestHeader('Overwrite', overwrite ? '?1' : '?0');
        if (session.key) xhr.setRequestHeader('X-Api-Key', session.key);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onprogress(e.loaded / e.total);
        };
        xhr.onload = () => {
          if (xhr.status === 401) session.signOut();
          resolve(xhr.status);
        };
        xhr.onerror = () => {
          resolve(0);
        };
        xhr.onabort = () => {
          resolve(0);
        };
        signal?.addEventListener('abort', () => {
          xhr.abort();
        });
        xhr.send(file);
      }),
    Priority.Action,
  );
}
