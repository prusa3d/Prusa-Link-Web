import { session } from '../auth/session.svelte';
import { Priority, queued } from './queue.svelte';
import { storedThumbnail, storeThumbnail } from './thumbnail-store';

/// Printer thumbnails. The printer wants the key on /thumb too, which an
/// <img> cannot send, so they are fetched here.
///
/// `/thumb/l/…` is the largest picture embedded in the G-code (often tens of
/// KB); `/thumb/s/…` exists only when the file has an exact 16×16 one.
/// Pictures wait behind every other request in the one queue (queue.ts), are
/// kept for the visit, and with a file `version` (its modification time and
/// size) also between visits (thumbnail-store.ts).

const memory = new Map<string, Promise<string | undefined>>();

/// The version a file's pictures are kept under.
export const fileVersion = (file: { m_timestamp?: number; size?: number }) =>
  file.m_timestamp === undefined
    ? undefined
    : `${String(file.m_timestamp)}-${String(file.size ?? 0)}`;

async function find(
  refs: (string | undefined)[],
  version: string | undefined,
  wanted: () => boolean,
): Promise<string | null | undefined> {
  for (const ref of refs) {
    if (!ref) continue;
    const key = version && `${ref}@${version}`;
    const kept = key ? await storedThumbnail(key) : undefined;
    if (kept) return URL.createObjectURL(kept);
    const blob = await queued(async (signal) => {
      if (!wanted()) return null;
      const headers: Record<string, string> = {};
      if (session.key) headers['X-Api-Key'] = session.key;
      // An abort (a person's action came) rejects, and the queue retries.
      const res = await fetch(ref, { headers, signal });
      return res.ok ? res.blob() : undefined;
    }, Priority.Background).catch(() => undefined);
    if (blob === null) return null;
    if (!blob) continue;
    if (key) void storeThumbnail(key, blob);
    return URL.createObjectURL(blob);
  }
  return undefined;
}

/// A small picture for a list row or a card, `size` pixels at most. The
/// printer's own small one (`/thumb/s`) exists only when the file embeds an
/// exact 16×16 picture, which most slicer profiles (the XL's among them) do
/// not; then the large one is fetched once, shrunk here, and kept under the
/// file's version, so the printer pays for it once per file, not per visit.
export async function smallThumbnail(
  wanted: () => boolean,
  version: string | undefined,
  small: string | undefined,
  large: string | undefined,
  size: number,
): Promise<string | null | undefined> {
  const id = `${version ?? ''}|small|${small ?? ''}|${large ?? ''}|${String(size)}`;
  const known = memory.get(id);
  if (known) return known;
  const key = version && `${small ?? large ?? ''}@${version}#${String(size)}`;
  const kept = key ? await storedThumbnail(key) : undefined;
  if (kept) {
    const url = URL.createObjectURL(kept);
    memory.set(id, Promise.resolve(url));
    return url;
  }
  let blob: Blob | null | undefined;
  for (const ref of [small, large]) {
    if (!ref) continue;
    blob = await fetchPicture(ref, wanted);
    if (blob !== undefined) break;
  }
  if (blob === null) return null;
  const shrunk = blob && (await shrink(blob, size).catch(() => blob));
  if (shrunk && key) void storeThumbnail(key, shrunk);
  const url = shrunk ? URL.createObjectURL(shrunk) : undefined;
  memory.set(id, Promise.resolve(url));
  return url;
}

/// The picture at `ref`; null when skipped because it is no longer wanted.
async function fetchPicture(
  ref: string,
  wanted: () => boolean,
): Promise<Blob | null | undefined> {
  return queued(async (signal) => {
    if (!wanted()) return null;
    const headers: Record<string, string> = {};
    if (session.key) headers['X-Api-Key'] = session.key;
    const res = await fetch(ref, { headers, signal });
    return res.ok ? res.blob() : undefined;
  }, Priority.Background).catch(() => undefined);
}

/// `blob` scaled down to fit `size` × `size`, as PNG; as it is when smaller.
async function shrink(blob: Blob, size: number): Promise<Blob> {
  const image = await createImageBitmap(blob);
  const scale = Math.min(1, size / Math.max(image.width, image.height));
  if (scale === 1) return blob;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => {
    canvas.toBlob((b) => {
      resolve(b ?? blob);
    }, 'image/png');
  });
}

/// For a picture that may scroll away while it waits its turn: once the turn
/// comes, `wanted` decides whether it is still asked for. Null means it was
/// skipped (and not remembered), so it can be asked again when back on screen.
export async function thumbnailWhenWanted(
  wanted: () => boolean,
  version: string | undefined,
  ...refs: (string | undefined)[]
): Promise<string | null | undefined> {
  const id = `${version ?? ''}|${refs.join('|')}`;
  const known = memory.get(id);
  if (known) return known;
  const url = await find(refs, version, wanted);
  if (url !== null) memory.set(id, Promise.resolve(url));
  return url;
}

/// An object URL for the first of `refs` the printer has a picture for.
export function thumbnailUrl(
  version: string | undefined,
  ...refs: (string | undefined)[]
): Promise<string | undefined> {
  const id = `${version ?? ''}|${refs.join('|')}`;
  let url = memory.get(id);
  if (!url) {
    url = find(refs, version, () => true).then((u) => u ?? undefined);
    memory.set(id, url);
  }
  return url;
}
