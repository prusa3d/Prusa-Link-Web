import { describe, expect, it } from 'vitest';

import { parseSlicerTime, readMetadata } from './metadata';

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

function u16(n: number) {
  return [n & 0xff, n >> 8];
}
function u32(n: number) {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, n >>> 24];
}

/// A minimal bgcode: uncompressed blocks, no checksums.
function bgcode(): Blob {
  const text = (s: string) => [...new TextEncoder().encode(s)];
  const block = (type: number, param: number[], data: number[]) => [
    ...u16(type),
    ...u16(0),
    ...u32(data.length),
    ...param,
    ...data,
  ];
  const printer = text('printer_model=MK4S\nfilament_type=PLA;PETG;PLA\n');
  const print = text('estimated printing time (normal mode)=1h 2m 3s\n');
  return new Blob([
    Uint8Array.from([
      ...text('GCDE'),
      ...u32(1),
      ...u16(0),
      ...block(3, u16(0), printer),
      ...block(5, [...u16(0), ...u16(16), ...u16(16)], [...PNG]),
      ...block(4, u16(0), print),
      ...block(1, u16(0), text('G28\n')),
    ]),
  ]);
}

describe('readMetadata', () => {
  it('reads a binary G-code file', async () => {
    const meta = await readMetadata(bgcode(), 'part.bgcode');
    expect(meta.printerModel).toBe('MK4S');
    expect(meta.materials).toEqual(['PLA', 'PETG']);
    expect(meta.duration).toBe(3723);
    expect(meta.thumbnail?.type).toBe('image/png');
    expect(new Uint8Array(await meta.thumbnail!.arrayBuffer())).toEqual(PNG);
  });

  it('reads a plain G-code file', async () => {
    const thumb = btoa(String.fromCharCode(...PNG));
    const gcode = [
      '; thumbnail begin 16x16 12',
      `; ${thumb}`,
      '; thumbnail end',
      'G28',
      '; estimated printing time (normal mode) = 42m 10s',
      '; filament_type = PETG',
      '; printer_model = COREONE',
    ].join('\n');
    const meta = await readMetadata(new Blob([gcode]), 'part.gcode');
    expect(meta).toMatchObject({
      duration: 2530,
      materials: ['PETG'],
      printerModel: 'COREONE',
    });
    expect(meta.thumbnail?.size).toBe(PNG.length);
  });

  it('gives nothing for a file it cannot read', async () => {
    expect(await readMetadata(new Blob(['junk']), 'x.bgcode')).toEqual({});
  });
});

describe('parseSlicerTime', () => {
  it('adds up the units', () => {
    expect(parseSlicerTime('1d 2h 3m 4s')).toBe(93_784);
    expect(parseSlicerTime('nothing')).toBeUndefined();
  });
});
