/// What a sliced file says about the printer it needs, from its head: the
/// printer metadata block of binary G-code (the second block), or the
/// leading `; key = value` comment block of plain G-code, which ends with a
/// bare `;` before the thumbnails. Filament types, colours, grams, nozzles
/// (Connect's gcodeSlots reads the same keys) and `objects_info`, the
/// plate's objects with their outlines.
///
/// One reader for a local File (`file.stream()`) and a printer download
/// (`response.body`): it reads only that block and cancels the stream, so a
/// print file is never downloaded whole.

export type Header = Record<string, string>;

export interface PlateObject {
  name: string;
  polygon: [number, number][];
}

const GCDE = 0x45444347;
const GCODE_BLOCK = 1;
const PRINTER_METADATA = 3;
const THUMBNAIL = 5;
/// Plain G-code without the value is given up after this much.
const TEXT_CAP = 1 << 20;

export function parseObjectsInfo(value: string): PlateObject[] | undefined {
  try {
    const { objects } = JSON.parse(value) as {
      objects?: { name?: unknown; polygon?: unknown }[];
    };
    if (!Array.isArray(objects)) return undefined;
    return objects.map((o) => ({
      name: typeof o.name === 'string' ? o.name : '',
      polygon: Array.isArray(o.polygon)
        ? (o.polygon as unknown[])
            .filter(
              (p): p is [number, number] =>
                Array.isArray(p) &&
                typeof p[0] === 'number' &&
                typeof p[1] === 'number',
            )
            .map(([x, y]) => [x, y])
        : [],
    }));
  } catch {
    return undefined;
  }
}

class Bytes {
  #reader: ReadableStreamDefaultReader<Uint8Array>;
  #buf = new Uint8Array(0);
  /// File offset of #buf[0].
  #base = 0;
  #done = false;

  constructor(stream: ReadableStream<Uint8Array>) {
    this.#reader = stream.getReader();
  }

  /// Bytes `at` to `end` of the file, fewer at its end. Forgets what lies
  /// before `at`, so a skipped block is never kept.
  async range(at: number, end: number): Promise<Uint8Array> {
    for (;;) {
      const drop = Math.min(at - this.#base, this.#buf.length);
      if (drop > 0) {
        this.#buf = this.#buf.subarray(drop);
        this.#base += drop;
      }
      if (this.#base + this.#buf.length >= end || this.#done) break;
      const { done, value } = await this.#reader.read();
      if (done) this.#done = true;
      else {
        const next = new Uint8Array(this.#buf.length + value.length);
        next.set(this.#buf);
        next.set(value, this.#buf.length);
        this.#buf = next;
      }
    }
    return at < this.#base
      ? new Uint8Array(0)
      : this.#buf.subarray(at - this.#base, end - this.#base);
  }

  /// Exactly `at` to `end`, or undefined when the file ends before.
  async exact(at: number, end: number): Promise<Uint8Array | undefined> {
    const b = await this.range(at, end);
    return b.length === end - at ? b : undefined;
  }

  /// What the stream gives next, for reading line by line; undefined at its
  /// end.
  async next(): Promise<Uint8Array | undefined> {
    if (this.#buf.length) {
      const held = this.#buf;
      this.#base += held.length;
      this.#buf = new Uint8Array(0);
      return held;
    }
    if (this.#done) return undefined;
    const { done, value } = await this.#reader.read();
    return done ? undefined : value;
  }

  cancel() {
    void this.#reader.cancel().catch(() => undefined);
  }
}

/// The objects of the plate: the index is the object's M486 id, the polygon
/// its convex outline in bed millimetres.
export function objectsOf(header: Header | undefined) {
  const value = header?.objects_info;
  return value === undefined ? undefined : parseObjectsInfo(value);
}

export async function readObjectsInfo(
  stream: ReadableStream<Uint8Array>,
): Promise<PlateObject[] | undefined> {
  return objectsOf(await readHeader(stream));
}

export async function readHeader(
  stream: ReadableStream<Uint8Array>,
): Promise<Header | undefined> {
  const bytes = new Bytes(stream);
  try {
    const head = await bytes.exact(0, 10);
    if (!head) return undefined;
    const view = (b: Uint8Array) =>
      new DataView(b.buffer, b.byteOffset, b.byteLength);
    if (view(head).getUint32(0, true) === GCDE)
      return await readBinary(bytes, view(head).getUint16(8, true) ? 4 : 0);
    return await readText(bytes);
  } catch {
    return undefined;
  } finally {
    bytes.cancel();
  }
}

async function readBinary(bytes: Bytes, checksum: number) {
  for (let at = 10; ;) {
    const header = await bytes.exact(at, at + 8);
    if (!header) return undefined;
    const h = new DataView(header.buffer, header.byteOffset, 8);
    const type = h.getUint16(0, true);
    const compression = h.getUint16(2, true);
    let size = h.getUint32(4, true);
    let headerSize = 8;
    if (compression) {
      const c = await bytes.exact(at + 8, at + 12);
      if (!c) return undefined;
      size = new DataView(c.buffer, c.byteOffset, 4).getUint32(0, true);
      headerSize = 12;
    }
    if (type === GCODE_BLOCK) return undefined;
    const start = at + headerSize + (type === THUMBNAIL ? 6 : 2);
    if (type === PRINTER_METADATA) {
      if (compression > 1) return undefined;
      const data = await bytes.exact(start, start + size);
      if (!data) return undefined;
      const header: Header = {};
      for (const line of new TextDecoder()
        .decode(compression ? await inflate(data) : data)
        .split('\n'))
        keyValue(header, line);
      return header;
    }
    at = start + size + checksum;
  }
}

async function inflate(data: Uint8Array): Promise<ArrayBuffer> {
  const stream = new Blob([data.slice()])
    .stream()
    .pipeThrough(new DecompressionStream('deflate'));
  return new Response(stream).arrayBuffer();
}

function keyValue(header: Header, line: string) {
  const eq = line.indexOf('=');
  if (eq > 0) header[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
}

/// G-code lines of the start G-code looked through for its printer model
/// check, after the comments.
const START_LINES = 100;

/// `; key = value` lines until a bare `;` or a line that is not a comment;
/// a line is read to its end however long (objects_info is one line).
/// Then the start G-code's printer model check, `M862.3 P "XL"`, which the
/// firmware judges the model by (header key `M862.3`). Lines are looked at
/// as they arrive, so nothing past that is asked for.
async function readText(bytes: Bytes) {
  const decoder = new TextDecoder();
  const header: Header = {};
  let text = '';
  let read = 0;
  let code = 0;
  for (;;) {
    const chunk = await bytes.next();
    read += chunk?.length ?? 0;
    text += chunk ? decoder.decode(chunk, { stream: true }) : decoder.decode();
    for (;;) {
      const nl = text.indexOf('\n');
      if (nl < 0 && (chunk || !text)) break;
      const line = (nl < 0 ? text : text.slice(0, nl)).trim();
      text = nl < 0 ? '' : text.slice(nl + 1);
      if (!line) continue;
      if (code || line === ';' || !line.startsWith(';')) {
        code ||= 1;
        // Comments (thumbnails, settings) on the way do not count.
        if (line.startsWith(';')) continue;
        const model = /^M862\.3 P\s*"([^"]*)"/.exec(line);
        if (model?.[1] !== undefined) header['M862.3'] = model[1];
        if (model || /^G(0|1|28)\b/.test(line) || ++code > START_LINES)
          return header;
        continue;
      }
      keyValue(header, line.slice(1));
    }
    if (!chunk || (read > TEXT_CAP && !text.includes('='))) return header;
  }
}
