import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parseObjectsInfo, readHeader, readObjectsInfo } from './header';

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

  it('reads the same shapes from plain G-code, on to its start G-code', async () => {
    const bytes = fixture('three-shapes.gcode');
    const { stream, seen } = counted(bytes, 256);
    const objects = await readObjectsInfo(stream);
    expect(objects?.map((o) => o.name)).toEqual(NAMES);
    const text = new TextDecoder().decode(bytes);
    // On to the start G-code's model check or first move, no further.
    // This sample has none: it is read to its end.
    const start = text.search(/\n(M862\.3|G28|G1 )/);
    expect(seen.read).toBeLessThanOrEqual(
      start < 0 ? bytes.length : start + 2 * 256,
    );
  });

  it('gives up at the start G-code’s first move without shapes', async () => {
    const text = `; printer_model = MK4S\n;\n${'; thumbnail data\n'.repeat(100)}G28\n${'G1 X1\n'.repeat(100)}`;
    const { stream, seen } = counted(new TextEncoder().encode(text), 8);
    expect(await readObjectsInfo(stream)).toBeUndefined();
    // The first move ends the start G-code's model check.
    expect(seen.read).toBeLessThan(text.indexOf('G28') + 24);
    expect(seen.cancelled).toBe(true);
  });

  it('reads the same printer keys from binary and plain G-code', async () => {
    const keys = [
      'filament_type',
      'extruder_colour',
      'nozzle_diameter',
      'nozzle_high_flow',
      'filament_abrasive',
    ];
    const binary = await readHeader(
      new Blob([fixture('three-shapes.bgcode')]).stream(),
    );
    const plain = await readHeader(
      new Blob([fixture('three-shapes.gcode')]).stream(),
    );
    for (const key of keys) expect(plain?.[key]).toBe(binary?.[key]);
    expect(plain?.extruder_colour).toBe('#F58231;#1F77B4;#2CA02C;#D62728');
    expect(plain?.['filament used [g]']).toBe('18.55, 0.00, 0.00, 0.00');
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

describe('the start G-code’s printer model check', () => {
  it('reads M862.3 past the thumbnails of real slicer output', async () => {
    // PrusaSlicer 2.6 for an XL5: printer_model XL5, M862.3 P "XL".
    const header = await readHeader(
      new Blob([fixture('xl-start-prusaslicer-2.6.gcode')]).stream(),
    );
    expect(header?.['M862.3']).toBe('XL');
  });

  it('has none where the file has no start G-code to read', async () => {
    const header = await readHeader(
      new Blob([fixture('four-colours.gcode')]).stream(),
    );
    expect(header?.['M862.3']).toBeUndefined();
    expect(header?.printer_model).toBe('COREONE_INDX4T');
  });
});
