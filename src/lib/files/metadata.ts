/// What a sliced file says about itself, read in the browser before upload:
/// its thumbnail, materials, print time and target printer. Reads only the
/// head and tail of the file, never all of it.
///
/// Binary G-code (libbgcode): a 10-byte header, then blocks. Metadata and
/// thumbnail blocks come before the first G-code block, which is where reading
/// stops. Plain G-code: thumbnails are base64 comments at the top, the slicer's
/// settings are comments at the bottom.

export interface FileMetadata {
  thumbnail?: Blob;
  materials?: string[];
  /// Seconds.
  duration?: number;
  printerModel?: string;
  /// Filament of every extruder together.
  grams?: number;
}

/// `18.55, 0.00, …` per extruder, summed; undefined without the key.
export function filamentGrams(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const sum = value
    .split(/[,;]/)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => a + b, 0);
  return sum > 0 ? sum : undefined;
}

const GCDE = 0x45444347;

/// Block types of libbgcode.
const Block = {
  FileMetadata: 0,
  GCode: 1,
  SlicerMetadata: 2,
  PrinterMetadata: 3,
  PrintMetadata: 4,
  Thumbnail: 5,
} as const;

const THUMBNAIL_TYPES: Record<number, string> = {
  0: 'image/png',
  1: 'image/jpeg',
};

export async function readMetadata(
  file: Blob,
  name: string,
): Promise<FileMetadata> {
  try {
    return name.toLowerCase().endsWith('.bgcode')
      ? await readBinary(file)
      : await readPlain(file);
  } catch {
    return {};
  }
}

/// `1d 2h 3m 4s`, as slicers write print times.
export function parseSlicerTime(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const units: Record<string, number> = { d: 86_400, h: 3600, m: 60, s: 1 };
  let total = 0;
  let found = false;
  for (const [, n, unit] of text.matchAll(/(\d+)\s*([dhms])/g)) {
    total += Number(n) * (units[unit ?? ''] ?? 0);
    found = true;
  }
  return found ? total : undefined;
}

function fromSettings(settings: Record<string, string>): FileMetadata {
  const meta: FileMetadata = {};
  const materials = settings.filament_type
    ?.split(';')
    .map((m) => m.trim())
    .filter(Boolean);
  if (materials?.length) meta.materials = [...new Set(materials)];
  const duration = parseSlicerTime(
    settings['estimated printing time (normal mode)'],
  );
  if (duration !== undefined) meta.duration = duration;
  if (settings.printer_model) meta.printerModel = settings.printer_model;
  const grams = filamentGrams(settings['filament used [g]']);
  if (grams !== undefined) meta.grams = grams;
  return meta;
}

function parseSettings(text: string, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split('\n')) {
    if (prefix && !line.startsWith(prefix)) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    out[line.slice(prefix.length, eq).trim()] = line
      .slice(eq + 1)
      .trim()
      .replace(/^"(.*)"$/, '$1');
  }
  return out;
}

async function bytes(
  file: Blob,
  start: number,
  length: number,
): Promise<DataView> {
  const buf = await file.slice(start, start + length).arrayBuffer();
  if (buf.byteLength < length) throw new Error('truncated');
  return new DataView(buf);
}

async function inflate(data: ArrayBuffer): Promise<ArrayBuffer> {
  const stream = new Blob([data])
    .stream()
    .pipeThrough(new DecompressionStream('deflate'));
  return new Response(stream).arrayBuffer();
}

async function readBinary(file: Blob): Promise<FileMetadata> {
  const header = await bytes(file, 0, 10);
  if (header.getUint32(0, true) !== GCDE) return {};
  const checksumSize = header.getUint16(8, true) === 1 ? 4 : 0;
  const settings: Record<string, string> = {};
  let thumbnail: { blob: Blob; pixels: number } | undefined;

  for (let at = 10; at < file.size;) {
    const block = await bytes(file, at, 12);
    const type = block.getUint16(0, true);
    const compression = block.getUint16(2, true);
    const size = compression
      ? block.getUint32(8, true)
      : block.getUint32(4, true);
    const headerSize = compression ? 12 : 8;
    const paramSize = type === Block.Thumbnail ? 6 : 2;
    const dataStart = at + headerSize + paramSize;
    if (type === Block.GCode) break;

    if (type === Block.Thumbnail) {
      const param = await bytes(file, at + headerSize, 6);
      const mime = THUMBNAIL_TYPES[param.getUint16(0, true)];
      const pixels = param.getUint16(2, true) * param.getUint16(4, true);
      if (mime && !compression && pixels > (thumbnail?.pixels ?? 0)) {
        thumbnail = {
          blob: file.slice(dataStart, dataStart + size, mime),
          pixels,
        };
      }
    } else if (
      type !== Block.FileMetadata &&
      (compression === 0 || compression === 1)
    ) {
      const raw = await file.slice(dataStart, dataStart + size).arrayBuffer();
      const data = compression === 1 ? await inflate(raw) : raw;
      Object.assign(settings, parseSettings(new TextDecoder().decode(data)));
    }
    at = dataStart + size + checksumSize;
  }

  const meta = fromSettings(settings);
  if (thumbnail) meta.thumbnail = thumbnail.blob;
  return meta;
}

const HEAD = 1 << 20;
const TAIL = 128 << 10;

async function readPlain(file: Blob): Promise<FileMetadata> {
  const head = await file.slice(0, HEAD).text();
  const tail =
    file.size > HEAD
      ? await file.slice(Math.max(HEAD, file.size - TAIL)).text()
      : '';
  const meta = fromSettings(parseSettings(`${head}\n${tail}`, '; '));
  let best: { blob: Blob; pixels: number } | undefined;
  for (const m of head.matchAll(
    /; thumbnail(?:_(JPG|PNG))? begin (\d+)x(\d+) \d+\n([\s\S]*?); thumbnail(?:_\w+)? end/g,
  )) {
    const [, kind, w, h, body] = m;
    const pixels = Number(w) * Number(h);
    if (pixels <= (best?.pixels ?? 0)) continue;
    const binary = atob((body ?? '').replace(/[;\s]/g, ''));
    const data = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    best = {
      blob: new Blob([data], {
        type: kind === 'JPG' ? 'image/jpeg' : 'image/png',
      }),
      pixels,
    };
  }
  if (best) meta.thumbnail = best.blob;
  return meta;
}
