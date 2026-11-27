import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { optimize, type XastElement, type XastParent } from 'svgo';
import svgpath from 'svgpath';
import type { Plugin } from 'vite';

import type { Bed, Shape } from '../src/lib/printer/bed-heat.ts';
import type { Variant } from '../src/lib/printer/models.ts';
import type {
  Condition,
  Fan,
  Heater,
  Label,
  LabelStyle,
  PictureStatus,
  Point,
} from '../src/lib/printer/status-picture.ts';

/// The picture each PrusaLink build carries, from assets/printers.
export const PRINTER_IMAGES: Readonly<Partial<Record<Variant, string>>> = {
  mini: 'mini.svg',
  mk35: 'mk35.svg',
  mk4: 'mk4s.svg',
  xl: 'xl.svg',
  coreone: 'coreone.svg',
  coreonel: 'coreonel.svg',
  coreone_indx: 'coreone_indx.svg',
  coreonel_indx: 'coreonel_indx.svg',
};

const ID = 'virtual:printer-images';

/// A picture as the build carries it: its SVG markup and, where the picture
/// editor saved a status picture, the labels drawn over it.
export interface BuiltPicture {
  svg: string;
  status?: PictureStatus;
}

/// `virtual:printer-images` exports `{ images }`, a BuiltPicture per
/// variant: every picture in the dev server, only `variant`'s in a printer
/// build, and the CORE One's in the generic build, where it stands for
/// every printer. SVGs are optimised to whole pixels. A printer's MMU3 is
/// part of its picture, shown by condition.
export function printerImages(variant: string | undefined): Plugin {
  return {
    name: 'prusalink-printer-images',
    resolveId(id) {
      return id === ID ? `\0${ID}` : undefined;
    },
    load(id) {
      if (id !== `\0${ID}`) return undefined;
      const pick = variant === 'generic' ? 'coreone' : variant;
      const built = (files: Readonly<Partial<Record<Variant, string>>>) =>
        Object.fromEntries(
          Object.entries(files)
            .filter(([v]) => !pick || v === pick)
            .map(([v, file]) => [v, builtPicture(file)]),
        );
      for (const file of Object.values(PRINTER_IMAGES))
        for (const f of statusFiles(file)) this.addWatchFile(f);
      return `export default ${JSON.stringify({
        images: built(PRINTER_IMAGES),
      })};`;
    },
  };
}

function statusFiles(file: string): [string, string] {
  const name = file.replace(/\.svg$/, '');
  return [`status/${name}.svg`, `status/${name}.json`].map((f) =>
    fileURLToPath(asset(f)),
  ) as [string, string];
}

const asset = (file: string) =>
  new URL(`../assets/printers/${file}`, import.meta.url);

/// The status picture (assets/printers/status/<name>.svg and .json, from
/// the picture editor) where both are there, else the plain picture.
export function builtPicture(file: string): BuiltPicture {
  const [svg, json] = statusFiles(file);
  if (!existsSync(svg) || !existsSync(json)) return { svg: svgSource(file) };
  const status = builtStatus(
    JSON.parse(readFileSync(json, 'utf8')) as SavedStatus,
    readFileSync(svg, 'utf8'),
    file,
  );
  return {
    svg: svgSource(
      `status/${file}`,
      status.conditional.map((c) => c.id),
    ),
    status,
  };
}

/// A saved status picture's JSON with the parts its SVG marks, as the app
/// gets it.
export function builtStatus(
  saved: SavedStatus,
  svg: string,
  file: string,
): PictureStatus {
  const status = halveStatus(saved);
  const marked = markedParts(
    flattenGradients(svg),
    Object.fromEntries(status.conditional.map((c) => [c.id, c.when])),
  );
  const missing = (what: string) => {
    console.warn(
      `${file}: no ${what} parts marked in its status SVG; save it in the picture editor`,
    );
  };
  for (const area of AREAS) {
    const a = saved[area];
    if (!a || !('parts' in a)) continue;
    const shapes = shapesOf(marked.get(area), false, area === 'bed');
    if (shapes.length) status[area] = shapes;
    else missing(area);
  }
  const fans = (saved.fans ?? []).flatMap((fan, i): Fan[] => {
    const found = marked.get(`fan${String(i)}`);
    if (!found) {
      missing('fan');
      return [];
    }
    const n = (v: number) => Math.round(v * 5) / 10;
    return [
      {
        kind: fan.kind,
        ...(fan.tool && { tool: fan.tool }),
        center: fan.center
          ? [n(fan.center[0]), n(fan.center[1])]
          : centerOf(found.map((f) => f.d)),
        shapes: shapesOf(found, true),
      },
    ];
  });
  if (fans.length) status.fans = fans;
  if (saved.carriage) {
    const shapes = shapesOf(marked.get('carriage'), true);
    if (shapes.length)
      status.carriage = {
        shapes,
        positions: Object.fromEntries(
          Object.entries(saved.carriage.positions).map(([tool, [x, y]]) => [
            tool,
            [Math.round(x * 5) / 10, Math.round(y * 5) / 10],
          ]),
        ),
      };
    else missing('carriage');
  }
  return status;
}

export interface SavedStatus {
  viewBox: string;
  style: LabelStyle;
  labels: {
    heater: Heater;
    anchor: Point;
    elbow: Point;
    end: Point;
    when?: Condition;
  }[];
  conditional?: { id: string; when: Condition }[];
  /// A rectangle, or the editor keys of the picture's own parts, which the
  /// status SVG marks (see markedParts).
  bed?: SavedArea;
  chamber?: SavedArea;
  status?: SavedArea;
  /// `center` on the 1000-unit canvas, where the editor moved it.
  fans?: { kind: Fan['kind']; tool?: number; center?: Point }[];
  /// The toolchanger's carriage: its offset in front of each tool's dock
  /// ("1"…), and parked ("0"), on the 1000-unit canvas.
  carriage?: { parts: string[]; positions: Record<string, Point> };
}

type SavedArea = Bed | { parts: string[] };

const AREAS = ['bed', 'chamber', 'status'] as const;

/// The saved labels and the area rectangles on the halved picture's grid
/// (see halve), the rectangles as paths like the parts markedParts reads
/// from the SVG.
export function halveStatus(saved: SavedStatus): PictureStatus {
  if (
    saved.viewBox
      .trim()
      .split(/[\s,]+/)
      .join(' ') !== '0 0 1000 1000'
  )
    throw new Error(`A status picture on a ${saved.viewBox} canvas`);
  const n = (v: number) => Math.round(v * 5) / 10;
  const p = ([x, y]: Point): Point => [n(x), n(y)];
  return {
    style: {
      value: n(saved.style.value),
      caption: n(saved.style.caption),
      stroke: n(saved.style.stroke),
      ...(saved.style.shadow && { shadow: true }),
    },
    labels: saved.labels.map((l): Label => ({
      heater: l.heater,
      anchor: p(l.anchor),
      elbow: p(l.elbow),
      end: p(l.end),
      ...(l.when && { when: l.when }),
    })),
    conditional: saved.conditional ?? [],
    ...Object.fromEntries(
      AREAS.flatMap((area) => {
        const a = saved[area];
        return a && !('parts' in a)
          ? [[area, [rectShape(a, area === 'bed' ? 0.9 : undefined)]]]
          : [];
      }),
    ),
  };
}

/// The picture editor marks a part as `data-<area>-part`, a fan's parts as
/// `data-fan-part` with the fans' indices.
const MARKS = ['bed', 'chamber', 'status', 'fan', 'carriage'].map(
  (m) => `data-${m}-part`,
);

/// Where a part's condition rides along with its inherited look.
const WHEN = '@when';

const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g;

/// Inherited presentation attributes a copy of a part keeps.
const KEPT = [
  'fill',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-linejoin',
] as const;

interface Found {
  d: string;
  look: Record<string, string>;
}

/// The marked parts of a status SVG by what they are (`bed`, `fan0`, …), as
/// path data with their transforms applied on the halved grid, each with the
/// condition of the conditional part (`conditional`, by id) it sits in.
export function markedParts(
  svg: string,
  conditional: Readonly<Record<string, string>> = {},
): Map<string, Found[]> {
  const found = new Map<string, Found[]>();
  const walk = (
    node: XastParent,
    transform: string,
    look: Record<string, string>,
  ) => {
    for (const el of node.children) {
      if (el.type !== 'element' || el.name === 'defs') continue;
      const t = `${transform} ${el.attributes.transform ?? ''}`;
      const own = { ...look, ...presentation(el) };
      const when = el.attributes.id && conditional[el.attributes.id];
      if (when) own[WHEN] = when;
      const roles = [
        ...[...AREAS, 'carriage' as const].filter(
          (a) => `data-${a}-part` in el.attributes,
        ),
        ...(el.attributes['data-fan-part'] ?? '')
          .split(' ')
          .filter(Boolean)
          .map((i) => `fan${i}`),
      ];
      const d = roles.length ? shapePath(el) : undefined;
      if (d) {
        const width = Number(own['stroke-width'] ?? 1) * scaleOf(t) * 0.5;
        const part = {
          d: svgpath(d)
            .transform(t)
            .round(0)
            .scale(0.5)
            .rel()
            .round(1)
            .toString(),
          look: { ...own, 'stroke-width': String(Math.round(width * 10) / 10) },
        };
        for (const role of roles)
          found.set(role, [...(found.get(role) ?? []), part]);
      }
      walk(el, t, own);
    }
  };
  optimize(svg, {
    plugins: [
      {
        name: 'marked-parts',
        fn: () => ({
          root: {
            enter: (root) => {
              walk(root, '', {});
            },
          },
        }),
      },
    ],
  });
  return found;
}

/// The parts as the app draws them, outlined as they were unless not
/// `outlined` and, with `filled`, in their own fill. Parts that look alike
/// share one path.
export function shapesOf(
  found: Found[] = [],
  filled = false,
  outlined = true,
): Shape[] {
  const shapes = new Map<string, Shape>();
  const paint = (v: string | undefined) =>
    v?.startsWith('url(') ? undefined : v;
  for (const { d, look } of found) {
    const stroke = outlined ? paint(look.stroke) : undefined;
    const fill = filled ? paint(look.fill) : undefined;
    const join = look['stroke-linejoin'] as Shape['stroke-linejoin'];
    const when = look[WHEN];
    const shape: Shape = {
      d,
      ...(when && { when }),
      ...(fill && { fill }),
      ...(look['fill-rule'] === 'evenodd' && { 'fill-rule': 'evenodd' }),
      ...(stroke &&
        stroke !== 'none' && {
          stroke,
          'stroke-width': Number(look['stroke-width']),
          ...(join && { 'stroke-linejoin': join }),
        }),
    };
    const key = JSON.stringify({ ...shape, d: '' });
    const same = shapes.get(key);
    if (same) same.d += d;
    else shapes.set(key, shape);
  }
  return [...shapes.values()];
}

/// The middle of the paths' bounds, counting curves' control points.
export function centerOf(paths: string[]): Point {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const d of paths) {
    const abs = svgpath(d).abs().unarc().unshort().toString();
    let x = 0;
    let y = 0;
    for (const [, cmd = '', args = ''] of abs.matchAll(
      /([A-Za-z])([^A-Za-z]*)/g,
    )) {
      const v = (args.match(NUMBER) ?? []).map(Number);
      if (cmd === 'H') x = v.at(-1) ?? x;
      else if (cmd === 'V') y = v.at(-1) ?? y;
      else
        for (let i = 0; i + 1 < v.length; i += 2) {
          x = v[i] ?? x;
          y = v[i + 1] ?? y;
          xs.push(x);
          ys.push(y);
        }
      xs.push(x);
      ys.push(y);
    }
  }
  const mid = (v: number[]) =>
    Math.round(((Math.min(...v) + Math.max(...v)) / 2) * 10) / 10;
  return [mid(xs), mid(ys)];
}

function presentation(el: XastElement): Record<string, string> {
  const style = Object.fromEntries(
    (el.attributes.style ?? '')
      .split(';')
      .map((decl) => decl.split(':').map((s) => s.trim()))
      .filter((kv): kv is [string, string] => kv.length === 2),
  );
  return Object.fromEntries(
    KEPT.flatMap((k) => {
      const v = style[k] ?? el.attributes[k];
      return v === undefined ? [] : [[k, v]];
    }),
  );
}

/// The shape's outline as path data in its own coordinates.
function shapePath({ name, attributes: a }: XastElement): string | undefined {
  const n = (k: string) => Number(a[k] ?? 0);
  const path = (...parts: (string | number)[]) => parts.join(' ');
  if (name === 'path') return a.d;
  if (name === 'rect') {
    const [x, y, w, h] = [n('x'), n('y'), n('width'), n('height')];
    const rx = Math.min(a.rx === undefined ? n('ry') : n('rx'), w / 2);
    const ry = Math.min(a.ry === undefined ? rx : n('ry'), h / 2);
    if (!rx || !ry) return path('M', x, y, 'h', w, 'v', h, 'h', -w, 'z');
    const arc = (dx: number, dy: number) => path('a', rx, ry, 0, 0, 1, dx, dy);
    return path(
      'M',
      x + rx,
      y,
      'h',
      w - 2 * rx,
      arc(rx, ry),
      'v',
      h - 2 * ry,
      arc(-rx, ry),
      'h',
      2 * rx - w,
      arc(-rx, -ry),
      'v',
      2 * ry - h,
      arc(rx, -ry),
      'z',
    );
  }
  if (name === 'circle' || name === 'ellipse') {
    const rx = name === 'circle' ? n('r') : n('rx');
    const ry = name === 'circle' ? n('r') : n('ry');
    const half = (dx: number) => path('a', rx, ry, 0, 1, 0, dx, 0);
    return path('M', n('cx') - rx, n('cy'), half(2 * rx), half(-2 * rx), 'z');
  }
  if (name === 'polygon' || name === 'polyline')
    return path('M', a.points ?? '', name === 'polygon' ? 'z' : '');
  return undefined;
}

/// How much `transform` scales lengths, on average over both axes.
function scaleOf(transform: string): number {
  const [ox = 0, oy = 0, xx = 1, xy = 0, yx = 0, yy = 1] = (
    svgpath('M0 0L1 0L0 1')
      .transform(transform)
      .abs()
      .toString()
      .match(NUMBER) ?? []
  ).map(Number);
  return Math.sqrt(Math.abs((xx - ox) * (yy - oy) - (xy - oy) * (yx - ox)));
}

function rectShape({ x, y, width, height, rx }: Bed, opacity?: number): Shape {
  const attributes = Object.fromEntries(
    Object.entries({ x, y, width, height, rx: rx ?? 0 }).map(([k, v]) => [
      k,
      String(Math.round(v * 5) / 10),
    ]),
  );
  const d = shapePath({
    type: 'element',
    name: 'rect',
    attributes,
    children: [],
  });
  return {
    d: svgpath(d ?? '')
      .round(1)
      .toString(),
    ...(opacity && { opacity }),
  };
}

/// `keep`: ids the page looks the parts up by, which svgo would shorten.
export function svgSource(file: string, keep: readonly string[] = []): string {
  return builtSvg(readFileSync(asset(file), 'utf8'), keep);
}

export function builtSvg(svg: string, keep: readonly string[] = []): string {
  const config = {
    multipass: true,
    floatPrecision: 0,
    plugins: [
      // The app draws fans, the status light and a toolchanger's carriage
      // in their place and needs no marks.
      {
        name: 'marks',
        fn: () => ({
          element: {
            enter: (el: XastElement, parent: XastParent) => {
              if (
                'data-fan-part' in el.attributes ||
                'data-status-part' in el.attributes ||
                'data-carriage-part' in el.attributes
              )
                parent.children = parent.children.filter((c) => c !== el);
              el.attributes = Object.fromEntries(
                Object.entries(el.attributes).filter(
                  ([k]) => !MARKS.includes(k),
                ),
              );
            },
          },
        }),
      },
      {
        name: 'preset-default' as const,
        params: { overrides: { cleanupIds: { preserve: [...keep] } } },
      },
    ],
  };
  const flat = optimize(flattenGradients(svg), config).data;
  const { data } = optimize(halve(flat), config);
  // Single quotes inside, so the JSON string around it needs no escaping.
  return data.replace(/"/g, "'");
}

/// Paints each linear gradient as the average of its stops. At the 56–150 px
/// the app draws a printer, a gradient is barely visible, and the XL picture
/// spends a third of its bytes on fifty of them.
function flattenGradients(svg: string): string {
  const colors = new Map<string, string>();
  for (const g of svg.matchAll(
    /<linearGradient[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/linearGradient>/g,
  )) {
    const stops = [
      ...(g[2] ?? '').matchAll(/stop-color="#([0-9a-fA-F]{6})"/g),
    ].map((m) => m[1] ?? '');
    if (!g[1] || !stops.length) continue;
    const channel = (i: number) =>
      Math.round(
        stops.reduce((sum, hex) => sum + parseInt(hex.slice(i, i + 2), 16), 0) /
          stops.length,
      )
        .toString(16)
        .padStart(2, '0');
    colors.set(g[1], `#${channel(0)}${channel(2)}${channel(4)}`);
  }
  return svg
    .replace(
      /url\(#([^)]+)\)/g,
      (ref: string, id: string) => colors.get(id) ?? ref,
    )
    .replace(/<linearGradient[\s\S]*?<\/linearGradient>/g, '');
}

/// Draws the 1000-unit picture on a 500-unit grid (paths and the shapes svgo
/// leaves as shapes), so whole-number
/// coordinates take fewer digits: about a sixth smaller gzipped. A 250 grid
/// garbles the small lettering; 500 does not show at the sizes the app draws.
function halve(svg: string): string {
  return (
    svg
      .replace(
        / d="([^"]+)"/g,
        (_, d: string) => ` d="${svgpath(d).scale(0.5).round(2).toString()}"`,
      )
      // Shapes svgo keeps as shapes (a rounded rect stays a <rect>).
      .replace(/<(rect|circle|ellipse|line)\b[^>]*>/g, (shape: string) =>
        shape.replace(
          / (x|y|x1|y1|x2|y2|width|height|rx|ry|cx|cy|r)="(-?[\d.]+)"/g,
          (_, name: string, value: string) =>
            ` ${name}="${String(Number(value) / 2)}"`,
        ),
      )
      .replace(
        / transform="([^"]+)"/g,
        (_, t: string) => ` transform="${halveTransform(t)}"`,
      )
      .replace(
        /stroke-width="([\d.]+)"/g,
        (_, w: string) => `stroke-width="${String(Number(w) / 2)}"`,
      )
      .replace(/<svg([^>]*)>/, (_, attrs: string) => {
        const kept = attrs.replace(/ (?:width|height|viewBox)="[^"]*"/g, '');
        return `<svg${kept} width="500" height="500" viewBox="0 0 500 500">`;
      })
  );
}

/// The transform that does on the halved grid what `t` did on the full one:
/// its translations halve, its scales and angles stay.
function halveTransform(t: string): string {
  return t.replace(
    /(matrix|translate|rotate)\(([^)]*)\)/g,
    (_, fn: string, args: string) => {
      const a = args
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      const halved = a.map((v, i) => {
        if (fn === 'translate') return v / 2;
        if (fn === 'matrix') return i >= 4 ? v / 2 : v;
        return i >= 1 ? v / 2 : v;
      });
      return `${fn}(${halved.join(' ')})`;
    },
  );
}
