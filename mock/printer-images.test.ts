import { existsSync, readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { describe, expect, it } from 'vitest';

import {
  builtPicture,
  halveStatus,
  MMU_IMAGES,
  PRINTER_IMAGES,
  svgSource,
} from './printer-images';

const box = (svg: string): [number, number, number, number] => {
  const b = new Resvg(svg).getBBox();
  if (!b) throw new Error('empty picture');
  return [b.x, b.y, b.width, b.height];
};

const asset = (file: string) =>
  new URL(`../assets/printers/${file}`, import.meta.url);

const pictures = [
  ...new Set([...Object.values(PRINTER_IMAGES), ...Object.values(MMU_IMAGES)]),
];
const statusPictures = pictures
  .map((f) => `status/${f}`)
  .filter((f) => existsSync(asset(f)));

// The build redraws each picture at half size; every part must land where it
// was, halved (a rounded <rect> once stayed at full size and stuck out).
describe.each([...pictures, ...statusPictures])('%s', (file) => {
  it('is the source picture at half size', () => {
    const source = readFileSync(asset(file), 'utf8');
    const built = svgSource(file).replace(/'/g, '"');
    const [x, y, w, h] = box(source);
    const half = box(built);
    [x / 2, y / 2, w / 2, h / 2].forEach((v, i) => {
      expect(Math.abs((half[i] ?? 0) - v)).toBeLessThan(2);
    });
  });
});

describe('halveStatus', () => {
  it('puts the labels on the halved grid', () => {
    expect(
      halveStatus({
        viewBox: '0 0 1000 1000',
        style: { value: 60, caption: 30, stroke: 4 },
        labels: [
          {
            heater: 'T1',
            anchor: [330.9, 527],
            elbow: [520.8, 357.2],
            end: [700.8, 357.2],
            when: 'mmu',
          },
        ],
        conditional: [{ id: 'door', when: 'enclosure' }],
      }),
    ).toEqual({
      style: { value: 30, caption: 15, stroke: 2 },
      labels: [
        {
          heater: 'T1',
          anchor: [165.5, 263.5],
          elbow: [260.4, 178.6],
          end: [350.4, 178.6],
          when: 'mmu',
        },
      ],
      conditional: [{ id: 'door', when: 'enclosure' }],
    });
  });

  it('puts the bed area on the halved grid, where there is one', () => {
    const saved = {
      viewBox: '0 0 1000 1000',
      style: { value: 60, caption: 30, stroke: 4 },
      labels: [],
    };
    expect(
      halveStatus({
        ...saved,
        bed: { x: 201, y: 701.3, width: 600, height: 24, rx: 5 },
      }).bed,
    ).toEqual({ x: 100.5, y: 350.7, width: 300, height: 12, rx: 2.5 });
    expect(
      halveStatus({ ...saved, bed: { x: 0, y: 0, width: 10, height: 10 } }).bed,
    ).toEqual({ x: 0, y: 0, width: 5, height: 5 });
    expect(halveStatus(saved)).not.toHaveProperty('bed');
  });

  it('refuses a canvas the halving does not fit', () => {
    expect(() =>
      halveStatus({
        viewBox: '0 0 800 800',
        style: { value: 60, caption: 30, stroke: 4 },
        labels: [],
      }),
    ).toThrow();
  });
});

describe('builtPicture', () => {
  it('carries the status picture and its labels where one is saved', () => {
    for (const file of pictures) {
      const saved = existsSync(asset(`status/${file}`));
      const built = builtPicture(file);
      expect(built.status !== undefined, file).toBe(
        saved && existsSync(asset(`status/${file.replace('.svg', '.json')}`)),
      );
      expect(built.svg).toMatch(/viewBox='0 0 500 500'/);
    }
  });
});
