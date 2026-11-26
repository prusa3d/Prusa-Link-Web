export type Point = [number, number];

/// SVG matrix(a b c d e f): x' = a*x + c*y + e, y' = b*x + d*y + f.
export type Matrix = [number, number, number, number, number, number];

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

export function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export function apply(m: Matrix, [x, y]: Point): Point {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/// The SVG `transform` attribute as one matrix. Unknown functions are skipped.
export function parseTransform(value: string | null | undefined): Matrix {
  let m = IDENTITY;
  for (const [, fn, args] of (value ?? '').matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const v = (args ?? '')
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    m = multiply(m, functionMatrix(fn ?? '', v));
  }
  return m;
}

function functionMatrix(fn: string, v: number[]): Matrix {
  const [a = 0, b, c] = v;
  switch (fn) {
    case 'matrix':
      return v.length === 6 ? (v as Matrix) : IDENTITY;
    case 'translate':
      return [1, 0, 0, 1, a, b ?? 0];
    case 'scale':
      return [a, 0, 0, b ?? a, 0, 0];
    case 'rotate': {
      const r = (a * Math.PI) / 180;
      const rot: Matrix = [
        Math.cos(r),
        Math.sin(r),
        -Math.sin(r),
        Math.cos(r),
        0,
        0,
      ];
      if (b === undefined || c === undefined) return rot;
      return multiply(multiply([1, 0, 0, 1, b, c], rot), [1, 0, 0, 1, -b, -c]);
    }
    case 'skewX':
      return [1, 0, Math.tan((a * Math.PI) / 180), 1, 0, 0];
    case 'skewY':
      return [1, Math.tan((a * Math.PI) / 180), 0, 1, 0, 0];
    default:
      return IDENTITY;
  }
}

export function parseViewBox(
  viewBox: string | null,
  width: string | null,
  height: string | null,
): ViewBox {
  const v = (viewBox ?? '')
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  if (v.length === 4 && v.every(Number.isFinite)) {
    const [x = 0, y = 0, w = 0, h = 0] = v;
    return { x, y, width: w, height: h };
  }
  return {
    x: 0,
    y: 0,
    width: parseFloat(width ?? '') || 300,
    height: parseFloat(height ?? '') || 150,
  };
}

export function formatViewBox(v: ViewBox): string {
  return [v.x, v.y, v.width, v.height].map(fmt).join(' ');
}

/// A client (CSS pixel) position over an `<svg>` drawn in `rect` to its user
/// space, for the default `preserveAspectRatio` (xMidYMid meet).
export function clientToSvg(
  [cx, cy]: Point,
  rect: { left: number; top: number; width: number; height: number },
  viewBox: ViewBox,
): Point {
  const scale = Math.min(
    rect.width / viewBox.width,
    rect.height / viewBox.height,
  );
  const ox = rect.left + (rect.width - viewBox.width * scale) / 2;
  const oy = rect.top + (rect.height - viewBox.height * scale) / 2;
  return [viewBox.x + (cx - ox) / scale, viewBox.y + (cy - oy) / scale];
}

export function round(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f || 0;
}

export function fmt(n: number): string {
  return String(round(n));
}

export function invert(m: Matrix): Matrix {
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;
  if (!det) return IDENTITY;
  return [
    d / det,
    -b / det,
    -c / det,
    a / det,
    (c * f - d * e) / det,
    (b * e - a * f) / det,
  ];
}

/// An axis-aligned edit in the root's user space: x' = sx * x + tx,
/// y' = sy * y + ty.
export type Affine = [number, number, number, number];

export const NO_CHANGE: Affine = [1, 1, 0, 0];

export function affineMatrix([sx, sy, tx, ty]: Affine): Matrix {
  return [sx, 0, 0, sy, tx, ty];
}

export function isNoChange([sx, sy, tx, ty]: Affine): boolean {
  return sx === 1 && sy === 1 && !tx && !ty;
}

export function moveAffine([sx, sy, tx, ty]: Affine, [dx, dy]: Point): Affine {
  return [sx, sy, round(tx + dx, 3), round(ty + dy, 3)];
}

/// `a` followed by a scale of `k` about `anchor`, which stays put.
export function scaleAffine(
  [sx, sy, tx, ty]: Affine,
  [kx, ky]: Point,
  [ax, ay]: Point,
): Affine {
  return [
    round(sx * kx, 5),
    round(sy * ky, 5),
    round(ax + kx * (tx - ax), 3),
    round(ay + ky * (ty - ay), 3),
  ];
}

/// `own` (an element's transform attribute) with the root-space edit `a`
/// put in front of it, for an element whose parent maps to the root with
/// `parent`: the new transform is parent⁻¹ · a · parent · own.
export function withAffine(
  own: string | null | undefined,
  parent: Matrix,
  a: Affine,
): string | null {
  const base = own?.trim() ?? '';
  if (isNoChange(a)) return base || null;
  const [p, q, r, s, e, f] = multiply(
    invert(parent),
    multiply(affineMatrix(a), parent),
  );
  const linear = [p, q, r, s].map((n) => round(n, 5));
  const edit =
    linear.join(' ') === '1 0 0 1'
      ? `translate(${fmt(e)} ${fmt(f)})`
      : `matrix(${[...linear, round(e, 3), round(f, 3)].join(' ')})`;
  return base ? `${edit} ${base}` : edit;
}
