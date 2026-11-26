import { readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { describe, expect, it } from 'vitest';

import { PRINTER_IMAGES, svgSource } from './printer-images';

const box = (svg: string): [number, number, number, number] => {
  const b = new Resvg(svg).getBBox();
  if (!b) throw new Error('empty picture');
  return [b.x, b.y, b.width, b.height];
};

// The build redraws each picture at half size; every part must land where it
// was, halved (a rounded <rect> once stayed at full size and stuck out).
describe.each(Object.values(PRINTER_IMAGES))('%s', (file) => {
  it('is the source picture at half size', () => {
    const source = readFileSync(
      new URL(`../assets/printers/${file}`, import.meta.url),
      'utf8',
    );
    const built = svgSource(file).replace(/'/g, '"');
    const [x, y, w, h] = box(source);
    const half = box(built);
    [x / 2, y / 2, w / 2, h / 2].forEach((v, i) => {
      expect(Math.abs((half[i] ?? 0) - v)).toBeLessThan(2);
    });
  });
});
