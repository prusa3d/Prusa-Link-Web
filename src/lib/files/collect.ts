import { isHiddenPath, isPrintable } from './filter';
import { gcodeFromZip, isZip } from './zip';
import { isFirmware } from '../firmware/releases';

export interface PickedFile {
  file: File;
  /// Path inside what was dropped, `folder/sub/part.bgcode`; just the name for a single file.
  path: string;
}

export interface Picked {
  files: PickedFile[];
  /// Files left out: hidden ones and ones that are not G-code.
  skipped: number;
  /// ZIP archives, unpacked by expandZips().
  zips: File[];
  /// Firmware (.bbf), which goes to the update dialog instead.
  firmware: File[];
}

/// Replaces the picked ZIPs by the G-code inside them. A ZIP that cannot be
/// read counts as one skipped file.
export async function expandZips(picked: Picked): Promise<Picked> {
  const out: Picked = {
    files: [...picked.files],
    skipped: picked.skipped,
    zips: [],
    firmware: picked.firmware,
  };
  for (const zip of picked.zips) {
    try {
      const inner = await gcodeFromZip(zip);
      out.files.push(
        ...inner.files.map((f) => ({ ...f, path: `${zip.name}/${f.path}` })),
      );
      out.skipped += inner.skipped;
    } catch {
      out.skipped += 1;
    }
  }
  return out;
}

/// The subset of the File and Directory Entries API the drop reads.
interface Entry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
  file?: (ok: (f: File) => void, fail: (e: unknown) => void) => void;
  createReader?: () => {
    readEntries: (
      ok: (entries: Entry[]) => void,
      fail: (e: unknown) => void,
    ) => void;
  };
}

/// Every printable file in what was dropped, folders included, recursively.
export async function collectDropped(
  items: Iterable<{ webkitGetAsEntry(): unknown }>,
  fallback: Iterable<File> = [],
): Promise<Picked> {
  const entries = [...items]
    .map((i) => i.webkitGetAsEntry() as Entry | null)
    .filter((e): e is Entry => e !== null);
  if (!entries.length) return collectFiles(fallback);
  const out: Picked = { files: [], skipped: 0, zips: [], firmware: [] };
  for (const entry of entries) await walk(entry, out);
  return out;
}

/// The printable files of a plain list, as a file picker gives it.
export function collectFiles(list: Iterable<File>): Picked {
  const out: Picked = { files: [], skipped: 0, zips: [], firmware: [] };
  for (const file of list) {
    const path = file.webkitRelativePath || file.name;
    add(out, file, path);
  }
  return out;
}

function add(out: Picked, file: File, path: string) {
  if (isHiddenPath(path)) out.skipped += 1;
  else if (isPrintable(file.name)) out.files.push({ file, path });
  else if (isZip(file.name)) out.zips.push(file);
  else if (isFirmware(file.name)) out.firmware.push(file);
  else out.skipped += 1;
}

async function walk(entry: Entry, out: Picked): Promise<void> {
  const path = entry.fullPath.replace(/^\//, '') || entry.name;
  if (isHiddenPath(path)) {
    if (entry.isFile) out.skipped += 1;
    return;
  }
  if (entry.isFile && entry.file) {
    const read = entry.file.bind(entry);
    add(
      out,
      await new Promise<File>((ok, fail) => {
        read(ok, fail);
      }),
      path,
    );
  } else if (entry.isDirectory && entry.createReader) {
    const reader = entry.createReader();
    // readEntries returns the folder in batches; an empty batch ends it.
    for (;;) {
      const batch = await new Promise<Entry[]>((ok, fail) => {
        reader.readEntries(ok, fail);
      });
      if (!batch.length) break;
      for (const child of batch) await walk(child, out);
    }
  }
}
