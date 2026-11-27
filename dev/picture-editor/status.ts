import {
  type Affine,
  formatViewBox,
  IDENTITY,
  type Matrix,
  multiply,
  parseTransform,
  parseViewBox,
  type Point,
  round,
  type ViewBox,
  isNoChange,
  NO_CHANGE,
  withAffine,
} from './geometry.ts';
import type { Bed } from '../../src/lib/printer/bed-heat.ts';
import { type Condition, parseCondition } from './conditions.ts';
import {
  applyStructure,
  findKey,
  parseStructure,
  type StructureOp,
  stripKeys,
  tagKeys,
} from './structure.ts';

export const HEATERS = [
  'T1',
  'T2',
  'T3',
  'T4',
  'T5',
  'T6',
  'T7',
  'T8',
  'bed',
  'chamber',
] as const;
export type Heater = (typeof HEATERS)[number];

export interface Label {
  heater: Heater;
  /// Where the leader starts, on the part it names (the nozzle tip, the bed).
  anchor: Point;
  /// Where the leader turns into the horizontal line the value sits on.
  elbow: Point;
  /// The far end of the horizontal line; always at the elbow's height.
  end: Point;
  side: 'right' | 'left';
  /// Shown only when this holds; see labelCondition for the implicit ones.
  when?: Condition;
}

/// Elements are named by their keys (see structure.ts). Transforms are in
/// the root's user space, the way the person saw them, and applied after the
/// structure edits.
export interface Edits {
  hidden: string[];
  transforms: Record<string, Affine>;
  structure: StructureOp[];
  /// Parts shown only under a condition, by key.
  conditions: Record<string, Condition>;
}

/// Label sizes in viewBox units: the value's and the caption's font size and
/// the leader's line width.
export interface LabelStyle {
  value: number;
  caption: number;
  stroke: number;
  /// A slight shadow under every label, to lift it off the picture.
  shadow?: true;
}

type LabelSize = Exclude<keyof LabelStyle, 'shadow'>;

/// `source` is `<editor source id>/<file>`, the picture the edits apply to.
export interface StatusPicture {
  source: string;
  viewBox: string;
  style: LabelStyle;
  labels: Label[];
  /// For the app: the ids of the saved SVG's conditional parts.
  conditional: { id: string; when: Condition }[];
  /// The bed area the app tints by the bed's temperature, over the picture
  /// and under the labels.
  bed?: BedArea;
  /// Tinted by the chamber's temperature, see-through, under the bed.
  chamber?: BedArea;
  /// Filled with the colour of the printer's state.
  status?: BedArea;
  /// Fans the app turns while they run.
  fans?: FanParts[];
  /// A toolchanger's carriage, slid in front of the picked tool's dock.
  carriage?: CarriageParts;
  edits: Edits;
  /// A variant picture (`<base>_<suffix>.svg`) takes its labels, style,
  /// areas and fans from its base's status picture; those above are that
  /// result, `overrides` what the variant changed.
  base?: string;
  overrides?: VariantOverrides;
}

/// Per heater: the variant's own label, or null when it drops the base's.
/// An area null: the variant has none though its base has one. `fans`: the
/// variant's own list in place of the base's.
export interface VariantOverrides {
  style?: LabelStyle;
  labels: Partial<Record<Heater, Label | null>>;
  bed?: BedArea | null;
  chamber?: BedArea | null;
  status?: BedArea | null;
  fans?: FanParts[];
}

export const AREAS = ['bed', 'chamber', 'status'] as const;
export type AreaName = (typeof AREAS)[number];

/// A fan's parts, by key, and what it cools; `center`, where the editor
/// moved it, is the point it turns around (else the middle of its parts).
export interface FanParts {
  parts: string[];
  kind: 'hotend' | 'print';
  tool?: number;
  center?: Point;
}

export type Areas = Pick<StatusPicture, AreaName | 'fans'>;

/// The carriage's parts, by key, and its offset from where it is drawn per
/// picked tool ("1"…) and with none picked ("0").
export interface CarriageParts {
  parts: string[];
  positions: Record<string, Point>;
}

export function normalizeCarriage(c: CarriageParts): CarriageParts {
  return {
    parts: [...new Set(c.parts)].sort(compareKeys),
    positions: Object.fromEntries(
      Object.entries(c.positions)
        .filter(([, p]) => p[0] || p[1])
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([k, p]) => [k, roundPoint(p)]),
    ),
  };
}

function parseCarriage(value: unknown): CarriageParts {
  const c = record(value, 'carriage');
  if (!Array.isArray(c.parts) || !c.parts.every((k) => typeof k === 'string'))
    throw new Error('Bad carriage parts');
  return normalizeCarriage({
    parts: c.parts,
    positions: Object.fromEntries(
      Object.entries(record(c.positions ?? {}, 'carriage positions')).map(
        ([k, v]) => [k, point(v)],
      ),
    ),
  });
}

/// The bed as parts of the picture, by key: the app fills them with the
/// bed's tint and keeps their outline. A variant's inherited keys name parts
/// of its own picture.
export interface BedParts {
  parts: string[];
}

/// A rectangle drawn over the bed, or the picture's own bed parts.
export type BedArea = Bed | BedParts;

export function isBedParts(bed: BedArea | undefined): bed is BedParts {
  return bed !== undefined && 'parts' in bed;
}

type Inheritable = Pick<StatusPicture, 'labels' | 'style'> & Areas;

function sameLabel(a: Label, b: Label): boolean {
  return JSON.stringify(labelJson(a)) === JSON.stringify(labelJson(b));
}

/// The base's labels, style and bed area with the variant's overrides
/// applied. Labels are matched by heater.
export function resolveVariant(
  base: Inheritable,
  overrides: VariantOverrides,
): Inheritable {
  const own = overrides.labels;
  const inherited = base.labels.flatMap((l) => {
    const o = own[l.heater];
    if (o === null) return [];
    return [o ?? l];
  });
  const added = HEATERS.flatMap((h) => {
    const o = own[h];
    return o && !base.labels.some((l) => l.heater === h) ? [o] : [];
  });
  const out: Inheritable = {
    labels: [...inherited, ...added],
    style: overrides.style ?? base.style,
  };
  for (const a of AREAS) {
    const area = overrides[a] === undefined ? base[a] : overrides[a];
    if (area) out[a] = area;
  }
  const fans = overrides.fans ?? base.fans;
  if (fans?.length) out.fans = fans;
  return out;
}

/// What a variant changed from its base: labels moved, added or dropped,
/// its own sizes and bed area.
export function diffVariant(
  base: Inheritable,
  labels: Label[],
  style: LabelStyle,
  areas: Areas = {},
): VariantOverrides {
  const out: VariantOverrides['labels'] = {};
  for (const b of base.labels) {
    const l = labels.find((x) => x.heater === b.heater);
    if (!l) out[b.heater] = null;
    else if (!sameLabel(l, b)) out[b.heater] = normalizeLabel(l);
  }
  for (const l of labels)
    if (!base.labels.some((b) => b.heater === l.heater))
      out[l.heater] = normalizeLabel(l);
  const diff: VariantOverrides = {
    ...(JSON.stringify(style) !== JSON.stringify(base.style) && { style }),
    labels: out,
  };
  for (const a of AREAS) {
    const own = areas[a] && normalizeBedArea(areas[a]);
    const from = base[a] && normalizeBedArea(base[a]);
    if (JSON.stringify(own) !== JSON.stringify(from)) diff[a] = own ?? null;
  }
  const fans = (areas.fans ?? []).map(normalizeFan);
  if (
    JSON.stringify(fans) !== JSON.stringify((base.fans ?? []).map(normalizeFan))
  )
    diff.fans = fans;
  return diff;
}

/// Rounded to a tenth, with no zero or negative size and no zero radius.
export function normalizeBed(bed: Bed): Bed {
  const r = (v: number) => round(v, 1);
  const rx = r(Math.min(bed.rx ?? 0, bed.width / 2, bed.height / 2));
  return {
    x: r(bed.x),
    y: r(bed.y),
    width: Math.max(r(bed.width), 0.1),
    height: Math.max(r(bed.height), 0.1),
    ...(rx > 0 && { rx }),
  };
}

/// Bed parts in key order, each once.
export function normalizeBedArea(bed: BedArea): BedArea {
  if (!isBedParts(bed)) return normalizeBed(bed);
  return { parts: [...new Set(bed.parts)].sort(compareKeys) };
}

/// `o` without `key`.
export function without<T>(o: T, key: keyof T): T {
  return Object.fromEntries(
    Object.entries(o as Record<string, unknown>).filter(([k]) => k !== key),
  ) as T;
}

/// Parts in key order, each once, the centre rounded to a tenth.
export function normalizeFan(fan: FanParts): FanParts {
  return {
    parts: [...new Set(fan.parts)].sort(compareKeys),
    kind: fan.kind,
    ...(fan.tool && { tool: fan.tool }),
    ...(fan.center && { center: roundPoint(fan.center) }),
  };
}

function parseFans(value: unknown): FanParts[] {
  if (!Array.isArray(value)) throw new Error('Bad fans');
  return value.map((v: unknown) => {
    const f = record(v, 'fan');
    const parts = f.parts;
    if (
      !Array.isArray(parts) ||
      !parts.length ||
      !parts.every((k) => typeof k === 'string') ||
      (f.kind !== 'hotend' && f.kind !== 'print')
    )
      throw new Error(`Bad fan ${JSON.stringify(v)}`);
    return normalizeFan({
      parts,
      kind: f.kind,
      ...(typeof f.tool === 'number' && f.tool > 0 && { tool: f.tool }),
      ...(f.center !== undefined && { center: point(f.center) }),
    });
  });
}

function parseBed(value: unknown): BedArea {
  const b = record(value, 'bed');
  if (b.parts !== undefined) {
    if (
      !Array.isArray(b.parts) ||
      !b.parts.length ||
      !b.parts.every((k) => typeof k === 'string')
    )
      throw new Error(`Bad bed parts ${JSON.stringify(b.parts)}`);
    return normalizeBedArea({ parts: b.parts });
  }
  const n = (k: string) => {
    const v = b[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    throw new Error(`Bad bed ${k} ${JSON.stringify(v)}`);
  };
  return normalizeBed({
    x: n('x'),
    y: n('y'),
    width: n('width'),
    height: n('height'),
    ...(b.rx !== undefined && { rx: n('rx') }),
  });
}

/// Whether `label` is still exactly the base's label for its heater.
export function isInherited(label: Label, base: Label[]): boolean {
  const b = base.find((x) => x.heater === label.heater);
  return b !== undefined && sameLabel(label, b);
}

/// Sized for a picture drawn about 600 px wide: the value about 36 px high.
export function defaultStyle(viewBox: ViewBox): LabelStyle {
  const w = viewBox.width;
  return {
    value: round(w * 0.06, 1),
    caption: round(w * 0.03, 1),
    stroke: round(w * 0.004, 2),
  };
}

/// Long enough for a chevron, a three-digit value and its degree sign.
export function labelLength(style: LabelStyle): number {
  return round(style.value * 3, 1);
}

export const SAMPLE_VALUES: Record<Heater, number> = {
  T1: 215,
  T2: 220,
  T3: 230,
  T4: 240,
  T5: 250,
  T6: 260,
  T7: 270,
  T8: 280,
  bed: 60,
  chamber: 35,
};

export function heaterName(h: Heater): string {
  if (h === 'bed') return 'Bed';
  if (h === 'chamber') return 'Chamber';
  return h;
}

/// The heaters a printer's labels can name. Tool changers get one per tool.
export function heatersFor(printer: string): Heater[] {
  let tools = 1;
  if (printer === 'xl') tools = 5;
  else if (printer.endsWith('_indx')) tools = 8;
  return [...HEATERS.slice(0, tools), 'bed', 'chamber'];
}

export function newLabel(
  heater: Heater,
  anchor: Point,
  elbow: Point,
  length: number,
): Label {
  const side = elbow[0] < anchor[0] ? 'left' : 'right';
  const dir = side === 'left' ? -1 : 1;
  return {
    heater,
    anchor: roundPoint(anchor),
    elbow: roundPoint(elbow),
    end: roundPoint([elbow[0] + dir * length, elbow[1]]),
    side,
  };
}

/// Keeps the line horizontal and `side` in step with where the end is.
export function normalizeLabel(label: Label): Label {
  const end: Point = [label.end[0], label.elbow[1]];
  return {
    ...label,
    anchor: roundPoint(label.anchor),
    elbow: roundPoint(label.elbow),
    end: roundPoint(end),
    side: end[0] < label.elbow[0] ? 'left' : 'right',
  };
}

export function flipLabel(label: Label): Label {
  return normalizeLabel({
    ...label,
    end: [2 * label.elbow[0] - label.end[0], label.elbow[1]],
  });
}

/// The value sits centred above the horizontal line, the heater's caption
/// below it, and a dot marks the anchor.
export function labelLayout(label: Label, style: LabelStyle) {
  return {
    textX: (label.elbow[0] + label.end[0]) / 2,
    valueY: label.elbow[1] - style.stroke * 1.5 - style.value * 0.12,
    captionY: label.elbow[1] + style.stroke * 1.5 + style.caption * 0.85,
    dot: style.stroke * 2.2,
  };
}

function boundsOf(xs: number[], ys: number[]): ViewBox {
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function unionBox(boxes: ViewBox[]): ViewBox | undefined {
  if (!boxes.length) return undefined;
  return boundsOf(
    boxes.flatMap((v) => [v.x, v.x + v.width]),
    boxes.flatMap((v) => [v.y, v.y + v.height]),
  );
}

function roundPoint([x, y]: Point): Point {
  return [round(x, 1), round(y, 1)];
}

export function emptyEdits(): Edits {
  return {
    hidden: [],
    transforms: {},
    structure: [],
    conditions: {},
  };
}

/// The JSON that sits next to the status SVG, in a stable key order.
export function serializeStatus(status: StatusPicture): string {
  const transforms = Object.fromEntries(
    Object.entries(status.edits.transforms)
      .filter(([, a]) => !isNoChange(a))
      .sort(([a], [b]) => compareKeys(a, b)),
  );
  return `${JSON.stringify(
    {
      source: status.source,
      viewBox: status.viewBox,
      style: status.style,
      ...(status.base !== undefined && { base: status.base }),
      labels: status.labels.map(labelJson),
      ...Object.fromEntries(
        AREAS.flatMap((a) => {
          const area = status[a];
          return area ? [[a, normalizeBedArea(area)]] : [];
        }),
      ),
      ...(status.fans?.length && { fans: status.fans.map(normalizeFan) }),
      ...(status.carriage?.parts.length && {
        carriage: normalizeCarriage(status.carriage),
      }),
      conditional: status.conditional,
      edits: {
        hidden: [...status.edits.hidden].sort(compareKeys),
        transforms,
        structure: status.edits.structure,
        conditions: Object.fromEntries(
          Object.entries(status.edits.conditions).sort(([a], [b]) =>
            compareKeys(a, b),
          ),
        ),
      },
      ...(status.overrides && {
        overrides: {
          ...(status.overrides.style && { style: status.overrides.style }),
          labels: Object.fromEntries(
            HEATERS.flatMap((h) => {
              const o = status.overrides?.labels[h];
              if (o === undefined) return [];
              return [[h, o && labelJson(o)]];
            }),
          ),
          ...Object.fromEntries(
            AREAS.flatMap((a) => {
              const o = status.overrides?.[a];
              return o === undefined ? [] : [[a, o && normalizeBedArea(o)]];
            }),
          ),
          ...(status.overrides.fans && {
            fans: status.overrides.fans.map(normalizeFan),
          }),
        },
      }),
    },
    null,
    2,
  )}\n`;
}

function labelJson(label: Label) {
  const l = normalizeLabel(label);
  return {
    heater: l.heater,
    anchor: l.anchor,
    elbow: l.elbow,
    end: l.end,
    side: l.side,
    ...(l.when && { when: l.when }),
  };
}

function parseLabel(value: unknown): Label {
  const l = record(value, 'label');
  const heater = HEATERS.find((h) => h === l.heater);
  if (!heater) throw new Error(`Bad heater ${JSON.stringify(l.heater)}`);
  const when = parseCondition(l.when);
  return normalizeLabel({
    heater,
    anchor: point(l.anchor),
    elbow: point(l.elbow),
    end: point(l.end),
    side: 'right',
    ...(when && { when }),
  });
}

function parseOverrides(value: unknown): VariantOverrides | undefined {
  if (value === undefined) return undefined;
  const o = record(value, 'overrides');
  const style = o.style === undefined ? undefined : record(o.style, 'style');
  const size = (k: LabelSize) => {
    const v = style?.[k];
    return typeof v === 'number' && v > 0 ? v : undefined;
  };
  const valueSize = size('value');
  const caption = size('caption');
  const stroke = size('stroke');
  return {
    ...(valueSize &&
      caption &&
      stroke && {
        style: {
          value: valueSize,
          caption,
          stroke,
          ...(style?.shadow === true && { shadow: true }),
        },
      }),
    labels: Object.fromEntries(
      Object.entries(record(o.labels ?? {}, 'label overrides')).flatMap(
        ([h, v]) => {
          const heater = HEATERS.find((x) => x === h);
          if (!heater) return [];
          return [[heater, v === null ? null : parseLabel(v)]];
        },
      ),
    ),
    ...Object.fromEntries(
      AREAS.flatMap((a) =>
        o[a] === undefined ? [] : [[a, o[a] === null ? null : parseBed(o[a])]],
      ),
    ),
    ...(o.fans !== undefined && { fans: parseFans(o.fans) }),
  };
}

export function parseStatus(text: string): StatusPicture {
  const raw = record(JSON.parse(text), 'status picture');
  const edits = record(raw.edits ?? {}, 'edits');
  const labels = Array.isArray(raw.labels) ? (raw.labels as unknown[]) : [];
  const viewBox = typeof raw.viewBox === 'string' ? raw.viewBox : '';
  const fallback = defaultStyle(parseViewBox(viewBox, null, null));
  const style = record(raw.style ?? {}, 'style');
  const size = (key: LabelSize) => {
    const v = style[key];
    return typeof v === 'number' && v > 0 ? v : fallback[key];
  };
  const overrides = parseOverrides(raw.overrides);
  return {
    source: typeof raw.source === 'string' ? raw.source : '',
    ...(typeof raw.base === 'string' && { base: raw.base }),
    ...(overrides && { overrides }),
    viewBox,
    style: {
      value: size('value'),
      caption: size('caption'),
      stroke: size('stroke'),
      ...(style.shadow === true && { shadow: true }),
    },
    labels: labels.map(parseLabel),
    ...Object.fromEntries(
      AREAS.flatMap((a) =>
        raw[a] === undefined ? [] : [[a, parseBed(raw[a])]],
      ),
    ),
    ...(raw.fans !== undefined && { fans: parseFans(raw.fans) }),
    ...(raw.carriage !== undefined && {
      carriage: parseCarriage(raw.carriage),
    }),
    conditional: (Array.isArray(raw.conditional)
      ? raw.conditional
      : []
    ).flatMap((value: unknown) => {
      const c = record(value, 'conditional part');
      const when = parseCondition(c.when);
      return typeof c.id === 'string' && when ? [{ id: c.id, when }] : [];
    }),
    edits: {
      hidden: Array.isArray(edits.hidden) ? edits.hidden.map(String) : [],
      transforms: {
        ...Object.fromEntries(
          Object.entries(record(edits.moves ?? {}, 'moves')).map(
            ([k, v]): [string, Affine] => {
              const [dx, dy] = point(v);
              return [k, [1, 1, dx, dy]];
            },
          ),
        ),
        ...Object.fromEntries(
          Object.entries(record(edits.transforms ?? {}, 'transforms')).map(
            ([k, v]) => [k, affine(v)],
          ),
        ),
      },
      structure: parseStructure(edits.structure),
      conditions: Object.fromEntries(
        Object.entries(record(edits.conditions ?? {}, 'conditions')).flatMap(
          ([k, v]) => {
            const c = parseCondition(v);
            return c ? [[k, c]] : [];
          },
        ),
      ),
    },
  };
}

function affine(v: unknown): Affine {
  if (
    Array.isArray(v) &&
    v.length === 4 &&
    v.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    v[0] !== 0 &&
    v[1] !== 0
  )
    return v as Affine;
  throw new Error(`Bad transform ${JSON.stringify(v)}`);
}

function record(value: unknown, what: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`Bad ${what}`);
  return value as Record<string, unknown>;
}

function point(p: unknown): Point {
  if (
    Array.isArray(p) &&
    p.length === 2 &&
    p.every((n) => typeof n === 'number' && Number.isFinite(n))
  )
    return [p[0] as number, p[1] as number];
  throw new Error(`Bad point ${JSON.stringify(p)}`);
}

/// Original paths in numeric order, then editor groups by id.
export function compareKeys(a: string, b: string): number {
  const ga = a.startsWith('g:');
  const gb = b.startsWith('g:');
  if (ga && gb) return a.localeCompare(b);
  if (ga !== gb) return ga ? 1 : -1;
  return comparePaths(a, b);
}

export function comparePaths(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (d) return d;
  }
  return 0;
}

/// What the ancestors' transforms do, from `el`'s parent up to (not
/// including) `root`, read through `transformOf`.
export function ancestorMatrix(
  el: Element,
  root: Element,
  transformOf: (el: Element) => string | null = (e) =>
    e.getAttribute('transform'),
): Matrix {
  let m = IDENTITY;
  for (let at = el.parentElement; at && at !== root; at = at.parentElement)
    m = multiply(parseTransform(transformOf(at)), m);
  return m;
}

/// The stroke-width that keeps a stroke as thick as before under the
/// scale `a`, on average over both axes.
export function compensatedStroke(width: string, a: Affine): string | null {
  const w = parseFloat(width);
  const k = Math.sqrt(Math.abs(a[0] * a[1]));
  return Number.isFinite(w) && k ? String(round(w / k, 3)) : null;
}

/// Applies `transforms` to the keyed elements under `root`, computing every
/// new transform from the original ones (`base`) first, so the order does
/// not matter. Strokes inside a scaled element keep their width.
export function applyTransforms(
  root: Element,
  transforms: Readonly<Record<string, Affine>>,
  base: (el: Element) => string | null,
  baseStroke: (el: Element) => string | null,
  keys: Iterable<string> = Object.keys(transforms),
) {
  const plan: [Element, string | null, Affine][] = [];
  for (const key of keys) {
    const el = findKey(root, key);
    if (!el) continue;
    const a = transforms[key] ?? NO_CHANGE;
    plan.push([el, withAffine(base(el), ancestorMatrix(el, root, base), a), a]);
  }
  const strokes = (el: Element) => [
    el,
    ...el.querySelectorAll('[stroke-width]'),
  ];
  for (const [el, t] of plan) {
    if (t) el.setAttribute('transform', t);
    else el.removeAttribute('transform');
    for (const s of strokes(el)) {
      const w = baseStroke(s);
      if (w !== null) s.setAttribute('stroke-width', w);
    }
  }
  // Nested scales are not combined: the innermost edit's compensation wins.
  for (const [el, , a] of plan) {
    if (a[0] === 1 && a[1] === 1) continue;
    for (const s of strokes(el)) {
      const w = baseStroke(s);
      if (w !== null)
        s.setAttribute('stroke-width', compensatedStroke(w, a) ?? w);
    }
  }
}

export function viewBoxOf(svg: Element): ViewBox {
  return parseViewBox(
    svg.getAttribute('viewBox'),
    svg.getAttribute('width'),
    svg.getAttribute('height'),
  );
}

/// Marks a part of an area in the status SVG, for the build to copy it.
export function partMark(what: AreaName | 'fan' | 'carriage'): string {
  return `data-${what}-part`;
}

/// Which parts are what: the areas' and the fans' keys.
export type PartMarks = Partial<Record<AreaName, readonly string[]>> & {
  fans?: readonly (readonly string[])[];
  carriage?: readonly string[];
};

/// The status SVG: the original with the structure edits replayed,
/// transforms baked in, hidden parts removed, the bed parts marked, and an
/// explicit viewBox so it scales; the canvas stays the original's.
export function exportSvg(
  source: string,
  edits: Pick<Edits, 'hidden' | 'transforms' | 'structure' | 'conditions'>,
  marks: PartMarks = {},
): string {
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.tagName !== 'svg') throw new Error('Not an SVG');
  tagKeys(root);
  applyStructure(root, edits.structure);
  const base = new Map(
    [...root.querySelectorAll('*')].map((el) => [
      el,
      el.getAttribute('transform'),
    ]),
  );
  const strokes = new Map(
    [...root.querySelectorAll('[stroke-width]')].map((el) => [
      el,
      el.getAttribute('stroke-width'),
    ]),
  );
  applyTransforms(
    root,
    edits.transforms,
    (el) => base.get(el) ?? null,
    (el) => strokes.get(el) ?? null,
  );
  for (const key of Object.keys(edits.conditions)) {
    const el = findKey(root, key);
    if (el && !el.id) el.id = partId(el, key);
  }
  markParts(root, marks);
  for (const el of edits.hidden.map((k) => findKey(root, k))) el?.remove();
  stripKeys(root);
  root.setAttribute('viewBox', formatViewBox(viewBoxOf(root)));
  return new XMLSerializer().serializeToString(doc);
}

/// Marks the parts under `root` (keyed) as what they are; a fan's parts with
/// the fans' indices.
export function markParts(root: Element, marks: PartMarks) {
  for (const a of [...AREAS, 'carriage' as const])
    for (const key of marks[a] ?? [])
      findKey(root, key)?.setAttribute(partMark(a), '');
  (marks.fans ?? []).forEach((keys, i) => {
    for (const key of keys) {
      const el = findKey(root, key);
      const was = el?.getAttribute(partMark('fan'));
      el?.setAttribute(
        partMark('fan'),
        was ? `${was} ${String(i)}` : String(i),
      );
    }
  });
}

/// The id a conditional part goes by in the saved SVG: its own, else one
/// made from its key.
export function partId(el: Element, key: string): string {
  return el.id || `part-${key.replace(/[^\w-]/g, '-')}`;
}

/// Prefixes every id and its references, so two copies of a picture (or two
/// pictures from the same exporter) on one page do not share gradients.
export function scopeIds(svg: string, prefix: string): string {
  return svg
    .replace(/\bid="([^"]+)"/g, `id="${prefix}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${prefix}$1"`);
}

/// Bed handles: a side or corner to resize by (n, se, …), the whole area to
/// move, or a new area drawn from the press point.
export type BedHandle =
  'draw' | 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/// The bed area while dragging `handle` from `start` to `at`.
export function dragBed(
  from: Bed | undefined,
  handle: BedHandle,
  start: Point,
  at: Point,
): Bed {
  const dx = at[0] - start[0];
  const dy = at[1] - start[1];
  if (!from || handle === 'draw')
    return normalizeBed({
      x: Math.min(start[0], at[0]),
      y: Math.min(start[1], at[1]),
      width: Math.abs(dx),
      height: Math.abs(dy),
    });
  if (handle === 'move')
    return normalizeBed({ ...from, x: from.x + dx, y: from.y + dy });
  let x0 = from.x;
  let x1 = from.x + from.width;
  let y0 = from.y;
  let y1 = from.y + from.height;
  if (handle.includes('w')) x0 += dx;
  if (handle.includes('e')) x1 += dx;
  if (handle.includes('n')) y0 += dy;
  if (handle.includes('s')) y1 += dy;
  return normalizeBed({
    ...from,
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    width: Math.abs(x1 - x0),
    height: Math.abs(y1 - y0),
  });
}
