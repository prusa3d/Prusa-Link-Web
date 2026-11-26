import { describe, expect, it } from 'vitest';

import {
  affineMatrix,
  apply,
  clientToSvg,
  formatViewBox,
  IDENTITY,
  invert,
  moveAffine,
  multiply,
  NO_CHANGE,
  parseTransform,
  parseViewBox,
  type Point,
  scaleAffine,
  withAffine,
} from './geometry.ts';

const close = (p: Point) => p.map((n) => Math.round(n * 100) / 100 || 0);

describe('parseTransform', () => {
  it('composes left to right like SVG', () => {
    const m = parseTransform('translate(10 20) scale(2)');
    expect(apply(m, [1, 1])).toEqual([12, 22]);
  });

  it('reads matrix, rotate about a point and commas', () => {
    expect(parseTransform('matrix(1,0,0,1,5,6)')).toEqual([1, 0, 0, 1, 5, 6]);
    expect(close(apply(parseTransform('rotate(90 10 10)'), [20, 10]))).toEqual([
      10, 20,
    ]);
  });

  it('treats nothing as the identity', () => {
    expect(parseTransform(null)).toEqual([1, 0, 0, 1, 0, 0]);
  });
});

describe('affine edits', () => {
  const at = (own: string | null, parent: string, p: Point) =>
    close(apply(parseTransform(parent), apply(parseTransform(own), p)));

  it('moves in root space through a scaled and rotated parent', () => {
    const parent = 'translate(7 7) rotate(30) scale(1.5 0.5)';
    const own = 'translate(3 4)';
    const moved = withAffine(own, parseTransform(parent), [1, 1, 12, -5]);
    const m = parseTransform(parent);
    const [x0, y0] = apply(m, apply(parseTransform(own), [1, 1]));
    const [x1, y1] = apply(m, apply(parseTransform(moved), [1, 1]));
    expect(x1 - x0).toBeCloseTo(12, 1);
    expect(y1 - y0).toBeCloseTo(-5, 1);
  });

  it('writes a plain translate when nothing scales', () => {
    expect(
      withAffine('scale(2)', parseTransform('scale(2)'), [1, 1, 10, 4]),
    ).toBe('translate(5 2) scale(2)');
    expect(withAffine(null, IDENTITY, NO_CHANGE)).toBeNull();
    expect(withAffine('scale(2)', IDENTITY, NO_CHANGE)).toBe('scale(2)');
  });

  it('scales about an anchor that stays put', () => {
    const a = scaleAffine(NO_CHANGE, [2, 1], [100, 50]);
    expect(a).toEqual([2, 1, -100, 0]);
    const m = affineMatrix(a);
    expect(apply(m, [100, 70])).toEqual([100, 70]);
    expect(apply(m, [110, 70])).toEqual([120, 70]);
  });

  it('composes moves and scales in order', () => {
    const a = scaleAffine(moveAffine(NO_CHANGE, [10, 0]), [3, 1], [0, 0]);
    expect(apply(affineMatrix(a), [1, 1])).toEqual([33, 1]);
  });

  it('scales inside a translated parent', () => {
    const parent = 'translate(100 0)';
    const own = null;
    const t = withAffine(own, parseTransform(parent), [2, 1, -100, 0]);
    // Root x 110 (local 10) scaled about root x 100 lands on 120.
    expect(at(t, parent, [10, 0])).toEqual([120, 0]);
  });

  it('inverts', () => {
    const m = parseTransform('translate(3 4) rotate(20) scale(2 3)');
    expect(close(apply(multiply(invert(m), m), [5, 7]))).toEqual([5, 7]);
  });
});

describe('viewBox', () => {
  it('falls back to width and height', () => {
    expect(parseViewBox(null, '1000', '800')).toEqual({
      x: 0,
      y: 0,
      width: 1000,
      height: 800,
    });
    expect(formatViewBox(parseViewBox('-10, 5 200 100', null, null))).toBe(
      '-10 5 200 100',
    );
  });
});

describe('clientToSvg', () => {
  const rect = { left: 100, top: 50, width: 400, height: 200 };

  it('maps through the scale and the viewBox offset', () => {
    const vb = { x: -50, y: 20, width: 200, height: 100 };
    expect(clientToSvg([100, 50], rect, vb)).toEqual([-50, 20]);
    expect(clientToSvg([500, 250], rect, vb)).toEqual([150, 120]);
  });

  it('accounts for the letterboxing of xMidYMid meet', () => {
    const vb = { x: 0, y: 0, width: 100, height: 100 };
    // 200 px square, centred: 100 px of empty space each side.
    expect(clientToSvg([200, 50], rect, vb)).toEqual([0, 0]);
    expect(clientToSvg([300, 150], rect, vb)).toEqual([50, 50]);
  });
});
