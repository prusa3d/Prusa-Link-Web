import { type Point, round, type ViewBox } from './geometry.ts';
import {
  type Heater,
  type Label,
  labelLength,
  type LabelStyle,
  normalizeLabel,
} from './status.ts';

/// How close, in picture units, a dragged point snaps to a guide.
export const SNAP = 6;

export interface Snapped {
  point: Point;
  /// The guide lines the point snapped to.
  x?: number;
  y?: number;
}

/// Snaps `p` to the nearest of `xs` and `ys` within `tolerance`, each axis
/// on its own.
export function snap(
  p: Point,
  xs: readonly number[],
  ys: readonly number[],
  tolerance = SNAP,
): Snapped {
  const nearest = (v: number, all: readonly number[]) => {
    let best: number | undefined;
    for (const c of all)
      if (
        Math.abs(c - v) <= tolerance &&
        (best === undefined || Math.abs(c - v) < Math.abs(best - v))
      )
        best = c;
    return best;
  };
  const x = nearest(p[0], xs);
  const y = nearest(p[1], ys);
  return {
    point: [x ?? p[0], y ?? p[1]],
    ...(x !== undefined && { x }),
    ...(y !== undefined && { y }),
  };
}

/// Where a point of label `skip` can snap: the other labels' points and the
/// picture's centre lines.
export function snapTargets(
  labels: readonly Label[],
  skip: number,
  viewBox: ViewBox,
): { xs: number[]; ys: number[] } {
  const others = labels.filter((_, i) => i !== skip);
  const points = others.flatMap((l) => [l.anchor, l.elbow, l.end]);
  return {
    xs: [...points.map((p) => p[0]), viewBox.x + viewBox.width / 2],
    ys: [...points.map((p) => p[1]), viewBox.y + viewBox.height / 2],
  };
}

function span(l: Label): [number, number] {
  return [Math.min(l.elbow[0], l.end[0]), Math.max(l.elbow[0], l.end[0])];
}

/// The label with its horizontal line shifted; the anchor stays.
function shiftLine(l: Label, dx: number, dy = 0): Label {
  return normalizeLabel({
    ...l,
    elbow: [l.elbow[0] + dx, l.elbow[1] + dy],
    end: [l.end[0] + dx, l.end[1] + dy],
  });
}

function update(
  labels: readonly Label[],
  idx: readonly number[],
  change: (l: Label, i: number) => Label,
): Label[] {
  return labels.map((l, i) => (idx.includes(i) ? change(l, i) : l));
}

export type Alignment = 'top' | 'middle' | 'bottom' | 'left' | 'right';

/// Lines to one height (top, middle or bottom of the selected lines) or
/// their left or right ends to one x.
export function align(
  labels: readonly Label[],
  idx: readonly number[],
  how: Alignment,
): Label[] {
  const picked = idx.flatMap((i) => labels[i] ?? []);
  if (picked.length < 2) return [...labels];
  if (how === 'left' || how === 'right') {
    const ends = picked.map((l) => span(l)[how === 'left' ? 0 : 1]);
    const target = how === 'left' ? Math.min(...ends) : Math.max(...ends);
    return update(labels, idx, (l) =>
      shiftLine(l, target - span(l)[how === 'left' ? 0 : 1]),
    );
  }
  const ys = picked.map((l) => l.elbow[1]);
  let y = ys.reduce((a, b) => a + b, 0) / ys.length;
  if (how === 'top') y = Math.min(...ys);
  else if (how === 'bottom') y = Math.max(...ys);
  return update(labels, idx, (l) => shiftLine(l, 0, round(y, 1) - l.elbow[1]));
}

/// Every selected line as long as the first selected one, each keeping its
/// side.
export function sameLength(
  labels: readonly Label[],
  idx: readonly number[],
): Label[] {
  const ref = labels[idx[0] ?? -1];
  if (!ref) return [...labels];
  const length = Math.abs(ref.end[0] - ref.elbow[0]);
  return update(labels, idx, (l) =>
    normalizeLabel({
      ...l,
      end: [l.elbow[0] + (l.side === 'left' ? -length : length), l.elbow[1]],
    }),
  );
}

/// Equal gaps between the lines across (x), or equal steps between their
/// heights (y); the outermost two stay. Needs three or more.
export function distribute(
  labels: readonly Label[],
  idx: readonly number[],
  axis: 'x' | 'y',
): Label[] {
  const picked = labels.flatMap((label, i) =>
    idx.includes(i) ? [{ i, label, span: span(label) }] : [],
  );
  if (picked.length < 3) return [...labels];
  const moved = new Map<number, Label>();
  if (axis === 'x') {
    picked.sort((a, b) => a.span[0] - b.span[0]);
    const first = picked[0]?.span[0] ?? 0;
    const last = Math.max(...picked.map((p) => p.span[1]));
    const widths = picked.reduce((sum, p) => sum + p.span[1] - p.span[0], 0);
    const gap = (last - first - widths) / (picked.length - 1);
    let x = first;
    for (const p of picked) {
      moved.set(p.i, shiftLine(p.label, round(x - p.span[0], 1)));
      x += p.span[1] - p.span[0] + gap;
    }
  } else {
    picked.sort((a, b) => a.label.elbow[1] - b.label.elbow[1]);
    const y0 = picked[0]?.label.elbow[1] ?? 0;
    const y1 = picked[picked.length - 1]?.label.elbow[1] ?? 0;
    picked.forEach((p, k) => {
      const y = y0 + ((y1 - y0) * k) / (picked.length - 1);
      moved.set(p.i, shiftLine(p.label, 0, round(y - p.label.elbow[1], 1)));
    });
  }
  return labels.map((l, i) => moved.get(i) ?? l);
}

/// The gap between lines in a tool row: enough that values do not touch.
function rowGap(style: LabelStyle): number {
  return round(style.value * 0.4, 1);
}

/// Labels for tools whose nozzles are at `anchors`, their lines side by side
/// on the row at `y`: equal length and gaps, in the nozzles' left-to-right
/// order so leaders do not cross, centred under the nozzles and kept inside
/// the picture. A row too wide for the picture gets shorter lines; see
/// rowFits.
export function layoutRow(
  tools: readonly { heater: Heater; anchor: Point }[],
  y: number,
  style: LabelStyle,
  viewBox: ViewBox,
): Label[] {
  const gap = rowGap(style);
  const margin = style.value * 0.3;
  const n = tools.length || 1;
  const room = (viewBox.width - 2 * margin - (n - 1) * gap) / n;
  const length = round(Math.min(labelLength(style), room), 1);
  const total = n * length + (n - 1) * gap;
  const middle = tools.reduce((sum, t) => sum + t.anchor[0], 0) / n;
  const start = Math.min(
    Math.max(middle - total / 2, viewBox.x + margin),
    viewBox.x + viewBox.width - margin - total,
  );
  const order = [...tools].sort((a, b) => a.anchor[0] - b.anchor[0]);
  return order.map((t, k) => {
    const x = round(start + k * (length + gap), 1);
    return normalizeLabel({
      heater: t.heater,
      anchor: t.anchor,
      elbow: [x, y],
      end: [x + length, y],
      side: 'right',
    });
  });
}

/// Whether `count` tool labels fit side by side at full length, so their
/// values do not run into each other.
export function rowFits(
  count: number,
  style: LabelStyle,
  viewBox: ViewBox,
): boolean {
  const gap = rowGap(style);
  const margin = style.value * 0.3;
  return (
    count * labelLength(style) + (count - 1) * gap <= viewBox.width - 2 * margin
  );
}

const isTool = (h: Heater) => /^T\d$/.test(h);

/// The tool labels whose lines are on the row at `y`.
export function rowAt(labels: readonly Label[], y: number): number[] {
  return labels.flatMap((l, i) =>
    isTool(l.heater) && Math.abs(l.elbow[1] - y) < 0.5 ? [i] : [],
  );
}

/// Lays the tool row at `y` out again, keeping each label's anchor and
/// condition, for example after a tool joined it.
export function respaceRow(
  labels: readonly Label[],
  y: number,
  style: LabelStyle,
  viewBox: ViewBox,
): Label[] {
  const idx = rowAt(labels, y);
  if (!idx.length) return [...labels];
  const row = labels.filter((_, i) => idx.includes(i));
  const laid = layoutRow(row, y, style, viewBox);
  return labels.map((l, i) => {
    if (!idx.includes(i)) return l;
    const next = laid.find((n) => n.heater === l.heater);
    return next ? { ...next, ...(l.when && { when: l.when }) } : l;
  });
}

/// The y of an existing tool row (two or more tools) near `y`, if any.
export function nearRow(
  labels: readonly Label[],
  y: number,
  tolerance = SNAP,
): number | undefined {
  const ys = labels.filter((l) => isTool(l.heater)).map((l) => l.elbow[1]);
  return ys.find(
    (r) =>
      Math.abs(r - y) <= tolerance &&
      ys.filter((o) => Math.abs(o - r) < 0.5).length >= 2,
  );
}
