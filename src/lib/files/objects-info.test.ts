import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parseObjectsInfo, readObjectsInfo } from './objects-info';

const fixture = (name: string) =>
  new Uint8Array(
    readFileSync(new URL(`../../../mock/fixtures/${name}`, import.meta.url)),
  );

/// A stream of `bytes` in network-sized chunks that counts what was pulled
/// and whether the reader cancelled it.
function counted(bytes: Uint8Array, chunk = 1460) {
  const seen = { read: 0, cancelled: false };
  let at = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (at >= bytes.length) {
        controller.close();
        return;
      }
      const part = bytes.slice(at, at + chunk);
      at += part.length;
      seen.read = at;
      controller.enqueue(part);
    },
    cancel() {
      seen.cancelled = true;
    },
  });
  return { stream, seen };
}

const NAMES = ['Shape-Cylinder', 'Shape-Sphere', 'Shape-Box'];

describe('objects_info', () => {
  it('reads the shapes from binary G-code and stops after its block', async () => {
    const bytes = fixture('three-shapes.bgcode');
    const { stream, seen } = counted(bytes);
    const objects = await readObjectsInfo(stream);
    expect(objects?.map((o) => o.name)).toEqual(NAMES);
    expect(objects?.map((o) => o.polygon.length)).toEqual([64, 40, 4]);
    expect(objects?.[2]?.polygon[0]?.[0]).toBeGreaterThan(181);
    expect(seen.read).toBeLessThan(8 * 1024);
    expect(seen.cancelled).toBe(true);
  });

  it('reads the same shapes from plain G-code before its thumbnails', async () => {
    const bytes = fixture('three-shapes.gcode');
    const { stream, seen } = counted(bytes, 256);
    const objects = await readObjectsInfo(stream);
    expect(objects?.map((o) => o.name)).toEqual(NAMES);
    const text = new TextDecoder().decode(bytes);
    const lineEnd = text.indexOf('\n', text.indexOf('objects_info'));
    // The line, and at most the chunk the stream already queued after it.
    expect(seen.read).toBeLessThanOrEqual(lineEnd + 2 * 256);
    expect(seen.cancelled).toBe(true);
  });

  it('gives up at the end of the plain header without shapes', async () => {
    const text = `; printer_model = MK4S\n;\n${'; thumbnail data\n'.repeat(100)}G28\n`;
    const { stream, seen } = counted(new TextEncoder().encode(text), 8);
    expect(await readObjectsInfo(stream)).toBeUndefined();
    expect(seen.read).toBeLessThan(64);
    expect(seen.cancelled).toBe(true);
  });

  it('reads a local File the same way', async () => {
    const file = new File([fixture('three-shapes.bgcode')], 'a.bgcode');
    expect((await readObjectsInfo(file.stream()))?.length).toBe(3);
  });

  it('answers undefined for something else', async () => {
    const { stream } = counted(new Uint8Array([1, 2, 3]));
    expect(await readObjectsInfo(stream)).toBeUndefined();
    expect(parseObjectsInfo('{"objects":[{"polygon":[[1,2],["x"]]}]}')).toEqual(
      [{ name: '', polygon: [[1, 2]] }],
    );
    expect(parseObjectsInfo('nope')).toBeUndefined();
  });
});
