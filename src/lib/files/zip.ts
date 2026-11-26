import type { PickedFile } from './collect';
import { isHiddenPath, isPrintable } from './filter';

/// The G-code files inside a ZIP, unpacked in the browser. Hidden entries
/// (`__MACOSX/`, `._x.gcode`) and everything else count as skipped.
///
/// A ZIP reader of its own instead of a library: it reads the central
/// directory and inflates with the browser's DecompressionStream, which keeps
/// the firmware budget for the app. Stored and deflated entries only, which is
/// what every common zipper writes; ZIP64 and encryption are not supported.
export async function gcodeFromZip(
  zip: File,
): Promise<{ files: PickedFile[]; skipped: number }> {
  const view = new DataView(await zip.arrayBuffer());
  const end = findEndOfDirectory(view);
  let at = view.getUint32(end + 16, true);
  const count = view.getUint16(end + 10, true);
  const files: PickedFile[] = [];
  let skipped = 0;

  for (let i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== 0x02014b50)
      throw new Error('bad ZIP directory');
    const method = view.getUint16(at + 10, true);
    const compressed = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const path = new TextDecoder().decode(
      new Uint8Array(view.buffer, at + 46, nameLength),
    );
    at += 46 + nameLength + extraLength + commentLength;

    if (path.endsWith('/')) continue;
    const name = path.slice(path.lastIndexOf('/') + 1);
    if (
      isHiddenPath(path) ||
      !isPrintable(name) ||
      (method !== 0 && method !== 8)
    ) {
      skipped += 1;
      continue;
    }
    const dataStart =
      local +
      30 +
      view.getUint16(local + 26, true) +
      view.getUint16(local + 28, true);
    const raw = new Blob([new Uint8Array(view.buffer, dataStart, compressed)]);
    const data =
      method === 8
        ? await new Response(
            raw.stream().pipeThrough(new DecompressionStream('deflate-raw')),
          ).blob()
        : raw;
    files.push({ path, file: new File([data], name) });
  }
  return { files, skipped };
}

export function isZip(name: string): boolean {
  return name.toLowerCase().endsWith('.zip');
}

/// The end-of-central-directory record: the last 22 bytes, or earlier when
/// the archive has a comment.
function findEndOfDirectory(view: DataView): number {
  for (
    let at = view.byteLength - 22;
    at >= Math.max(0, view.byteLength - 65_557);
    at--
  ) {
    if (view.getUint32(at, true) === 0x06054b50) return at;
  }
  throw new Error('not a ZIP file');
}
