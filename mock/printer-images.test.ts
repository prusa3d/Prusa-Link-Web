import { existsSync, readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { describe, expect, it } from 'vitest';

import {
  builtPicture,
  builtStatus,
  builtSvg,
  centerOf,
  markedParts,
  shapesOf,
  halveStatus,
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

const pictures = [...new Set(Object.values(PRINTER_IMAGES))];
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
    ).toEqual([
      {
        d: 'M103 350.7h295a2.5 2.5 0 0 1 2.5 2.5v7a2.5 2.5 0 0 1-2.5 2.5h-295a2.5 2.5 0 0 1-2.5-2.5v-7a2.5 2.5 0 0 1 2.5-2.5z',
        opacity: 0.9,
      },
    ]);
    expect(
      halveStatus({ ...saved, bed: { x: 0, y: 0, width: 10, height: 10 } }).bed,
    ).toEqual([{ d: 'M0 0h5v5h-5z', opacity: 0.9 }]);
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
    // Every picture through svgo twice: the XL's all-in-one takes a while.
  }, 60_000);
});

// What the picture editor saves for a bed of three parts, two moved or
// resized in a scaled group (their transforms baked in, the scaled one's
// stroke compensated), and an unmarked part.
const BED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
  <path d="M0 0h1000v1000z" fill="#000"/>
  <g transform="scale(2)" stroke="#2b2b2a" stroke-linejoin="round">
    <path data-bed-part="" d="M100 300h200l-20 10h-160z" transform="matrix(2 0 0 1 5 0)" stroke-width="0.7071" fill="#444"/>
    <rect data-bed-part="" x="10" y="20" width="30" height="5" transform="translate(0 10)" stroke-width="1"/>
  </g>
  <circle data-bed-part="" cx="900" cy="900" r="10" style="stroke:none"/>
</svg>`;

const bedShapes = (svg: string) => shapesOf(markedParts(svg).get('bed'));

describe('marked parts', () => {
  it('copies the marked parts with their transforms, on the halved grid', () => {
    const [outlined, plain] = bedShapes(BED_SVG);
    // Both outlined alike: the path's stroke, thinned to keep its width
    // under the editor's 2× scale, is as wide as the rect's.
    expect(outlined).toEqual({
      d: 'M205 300h400l-40 10h-320zM10 30h30v5h-30z',
      stroke: '#2b2b2a',
      'stroke-width': 1,
      'stroke-linejoin': 'round',
    });
    expect(plain?.d).toMatch(/^M445 450a5 5 0 1 0 10 0/);
    expect(plain).not.toHaveProperty('stroke');
  });

  it('finds none in a picture without marks', () => {
    expect(bedShapes(BED_SVG.replace(/ data-bed-part=""/g, ''))).toEqual([]);
  });

  it('leaves part lists to the SVG and draws rectangles as paths', () => {
    expect(
      halveStatus({
        viewBox: '0 0 1000 1000',
        style: { value: 60, caption: 30, stroke: 4 },
        labels: [],
        bed: { parts: ['0.1'] },
      }),
    ).not.toHaveProperty('bed');
  });

  it('copies a fan in its own fill, per fan, and sorts areas apart', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" fill="none">
      <g data-fan="hotend" transform="translate(400 200)">
        <circle data-fan-part="0" r="40" fill="#555" stroke="#222"/>
        <path data-fan-part="0 1" d="M0-30 10 0h-20z" fill="#ddd"/>
      </g>
      <rect data-chamber-part="" data-status-part="" x="100" y="100" width="20" height="10" fill="#333"/>
    </svg>`;
    const parts = markedParts(svg);
    expect([...parts.keys()].sort()).toEqual([
      'chamber',
      'fan0',
      'fan1',
      'status',
    ]);
    expect(shapesOf(parts.get('fan0'), true)).toEqual([
      {
        d: 'M180 100a20 20 0 1 0 40 0 20 20 0 1 0-40 0z',
        fill: '#555',
        stroke: '#222',
        'stroke-width': 0.5,
      },
      { d: 'M200 85l5 15h-10z', fill: '#ddd' },
    ]);
    expect(shapesOf(parts.get('status'))).toEqual([{ d: 'M50 50h10v5h-10z' }]);
    expect(centerOf((parts.get('fan0') ?? []).map((p) => p.d))).toEqual([
      200, 100,
    ]);
  });

  it('leaves the fans and the status light out of the built picture, and every mark', () => {
    const built =
      builtSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
      <path data-bed-part="" d="M0 0h100v100z"/>
      <path data-fan-part="0" d="M500 500h100v100z" fill="#f00"/>
      <path data-status-part="" d="M0 900h100v10z" fill="#0f0"/>
    </svg>`);
    expect(built).not.toContain('data-');
    expect(built).not.toContain('#f00');
    expect(built).not.toContain('#0f0');
    expect(built).toContain('<path');
  });

  it('gives a part the condition of the conditional part it sits in', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
      <g id="m0"><path data-fan-part="0" d="M0 0h10v10z"/></g>
      <g id="m1"><path data-fan-part="1" d="M20 0h10v10z"/></g>
      <path data-bed-part="" d="M0 900h100v10z"/>
    </svg>`;
    const parts = markedParts(svg, { m0: '!mmu', m1: 'mmu' });
    expect(shapesOf(parts.get('fan0'), true)[0]?.when).toBe('!mmu');
    expect(shapesOf(parts.get('fan1'), true)[0]?.when).toBe('mmu');
    expect(shapesOf(parts.get('bed'))[0]).not.toHaveProperty('when');
  });

  it("carries a carriage's parts and its positions on the halved grid", () => {
    const status = builtStatus(
      {
        viewBox: '0 0 1000 1000',
        style: { value: 60, caption: 30, stroke: 4 },
        labels: [],
        carriage: { parts: ['0'], positions: { '3': [192.6, 0] } },
      },
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
        <path data-carriage-part="" d="M260 200h48v72h-48z" fill="#2B2A29"/>
      </svg>`,
      'test.svg',
    );
    expect(status.carriage).toEqual({
      shapes: [{ d: 'M130 100h24v36h-24z', fill: '#2B2A29' }],
      positions: { '3': [96.3, 0] },
    });
  });

  it('puts a chamber rectangle on the halved grid, opaque', () => {
    expect(
      halveStatus({
        viewBox: '0 0 1000 1000',
        style: { value: 60, caption: 30, stroke: 4 },
        labels: [],
        chamber: { x: 0, y: 0, width: 10, height: 10 },
      }).chamber,
    ).toEqual([{ d: 'M0 0h5v5h-5z' }]);
  });
});
