import { describe, expect, it } from 'vitest';

import type { Point } from './geometry.ts';
import {
  align,
  distribute,
  layoutRow,
  nearRow,
  respaceRow,
  rowAt,
  rowFits,
  sameLength,
  snap,
  snapTargets,
} from './label-tools.ts';
import { type Heater, type Label, newLabel } from './status.ts';

const STYLE = { value: 50, caption: 25, stroke: 4 };
const VIEW = { x: 0, y: 0, width: 1000, height: 1000 };

const label = (heater: Heater, anchor: Point, elbow: Point, length = 100) =>
  newLabel(heater, anchor, elbow, length);

describe('snap', () => {
  it('pulls each axis to the nearest target within reach', () => {
    expect(snap([103, 205], [100, 108], [300])).toEqual({
      point: [100, 205],
      x: 100,
    });
    expect(snap([50, 50], [57], [44, 47], 6)).toEqual({
      point: [50, 47],
      y: 47,
    });
  });

  it('offers the other labels and the centre lines', () => {
    const ls = [label('T1', [1, 2], [3, 4]), label('bed', [5, 6], [7, 8])];
    const t = snapTargets(ls, 0, VIEW);
    expect(t.xs).toEqual([5, 7, 107, 500]);
    expect(t.ys).toEqual([6, 8, 8, 500]);
  });
});

describe('arranging labels', () => {
  const a = label('T1', [0, 300], [100, 100]);
  const b = label('T2', [0, 300], [300, 120], 60);
  const c = label('T3', [0, 300], [500, 90], 80);
  const all = [a, b, c];

  it('aligns lines to the top, middle or bottom, anchors staying', () => {
    expect(align(all, [0, 1, 2], 'top').map((l) => l.elbow[1])).toEqual([
      90, 90, 90,
    ]);
    expect(align(all, [0, 1], 'middle').map((l) => l.end[1])).toEqual([
      110, 110, 90,
    ]);
    const bottom = align(all, [0, 1, 2], 'bottom');
    expect(bottom.map((l) => l.elbow[1])).toEqual([120, 120, 120]);
    expect(bottom.map((l) => l.anchor)).toEqual(all.map((l) => l.anchor));
  });

  it('aligns left and right ends', () => {
    expect(align(all, [0, 1, 2], 'left').map((l) => l.elbow[0])).toEqual([
      100, 100, 100,
    ]);
    expect(align(all, [0, 1, 2], 'right').map((l) => l.end[0])).toEqual([
      580, 580, 580,
    ]);
  });

  it('makes lines as long as the first picked', () => {
    expect(
      sameLength(all, [2, 0, 1]).map((l) => l.end[0] - l.elbow[0]),
    ).toEqual([80, 80, 80]);
  });

  it('spaces lines with equal gaps, the outer two staying', () => {
    const d = distribute(all, [0, 1, 2], 'x');
    expect(d.map((l) => [l.elbow[0], l.end[0]])).toEqual([
      [100, 200],
      [320, 380],
      [500, 580],
    ]);
    expect(distribute(all, [0, 1, 2], 'y').map((l) => l.elbow[1])).toEqual([
      105, 120, 90,
    ]);
    expect(distribute(all, [0, 1], 'x')).toEqual(all);
  });
});

describe('tool rows', () => {
  const nozzles = [400, 200, 600, 300, 500].map(
    (x, k): { heater: Heater; anchor: Point } => ({
      heater: `T${String(k + 1)}` as Heater,
      anchor: [x, 400],
    }),
  );

  it('lays lines side by side under the nozzles, in their order', () => {
    const row = layoutRow(nozzles, 150, STYLE, VIEW);
    expect(row.map((l) => l.heater)).toEqual(['T2', 'T4', 'T1', 'T5', 'T3']);
    const lefts = row.map((l) => l.elbow[0]);
    const step = 150 + 20;
    expect(lefts.slice(1).map((x, k) => round(x - (lefts[k] ?? 0)))).toEqual([
      step,
      step,
      step,
      step,
    ]);
    expect(row.every((l) => l.elbow[1] === 150 && l.end[1] === 150)).toBe(true);
    // 5 × 150 + 4 × 20 = 830 wide; centred on x 400 it would start at -15.
    expect(lefts[0]).toBeGreaterThanOrEqual(0);
    expect((row[4]?.end[0] ?? 0) <= 1000).toBe(true);
  });

  it('shortens the lines of a row too wide for the picture', () => {
    const big = { value: 60, caption: 30, stroke: 4 };
    expect(rowFits(5, STYLE, VIEW)).toBe(true);
    expect(rowFits(5, big, VIEW)).toBe(false);
    const row = layoutRow(nozzles, 150, big, VIEW);
    expect(row[0]?.elbow[0]).toBeGreaterThanOrEqual(0);
    expect(row[4]?.end[0]).toBeLessThanOrEqual(1000);
    expect((row[0]?.end[0] ?? 0) - (row[0]?.elbow[0] ?? 0)).toBeLessThan(180);
  });

  it('re-spaces a row when a tool joins it', () => {
    const two = layoutRow(nozzles.slice(0, 2), 150, STYLE, VIEW);
    const bed = label('bed', [500, 900], [600, 800]);
    const added = [
      ...two,
      bed,
      label('T3', [600, 400], [900, 150], 180),
    ] as Label[];
    expect(nearRow(two, 153)).toBe(150);
    expect(nearRow(two, 170)).toBeUndefined();
    expect(rowAt(added, 150)).toEqual([0, 1, 3]);
    const spaced = respaceRow(added, 150, STYLE, VIEW);
    expect(spaced[2]).toEqual(bed);
    const xs = [0, 1, 3]
      .map((i) => spaced[i]?.elbow[0] ?? 0)
      .sort((p, q) => p - q);
    expect(round((xs[2] ?? 0) - (xs[1] ?? 0))).toBe(
      round((xs[1] ?? 0) - (xs[0] ?? 0)),
    );
  });
});

function round(n: number) {
  return Math.round(n * 10) / 10;
}
