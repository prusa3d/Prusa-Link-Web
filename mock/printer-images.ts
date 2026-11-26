import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { optimize } from 'svgo';
import svgpath from 'svgpath';
import type { Plugin } from 'vite';

import type { Variant } from '../src/lib/printer/models.ts';
import type {
  Condition,
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

/// The same printer with an MMU3 attached, drawn on the same canvas with the
/// printer in the same place: the page swaps to it once the printer reports
/// the MMU.
export const MMU_IMAGES: Readonly<Partial<Record<Variant, string>>> = {
  mk4: 'mk4s_mmu3.svg',
  coreone: 'coreone_mmu3.svg',
};

const ID = 'virtual:printer-images';

/// A picture as the build carries it: its SVG markup and, where the picture
/// editor saved a status picture, the labels drawn over it.
export interface BuiltPicture {
  svg: string;
  status?: PictureStatus;
}

/// `virtual:printer-images` exports `{ images, mmu }`, a BuiltPicture per
/// variant: every picture in the dev server, only `variant`'s in a printer
/// build, and the CORE One's in the generic build, where it stands for
/// every printer. SVGs are optimised to whole pixels.
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
      for (const file of Object.values({ ...PRINTER_IMAGES, ...MMU_IMAGES }))
        for (const f of statusFiles(file)) this.addWatchFile(f);
      return `export default ${JSON.stringify({
        images: built(PRINTER_IMAGES),
        mmu: built(MMU_IMAGES),
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
  const status = halveStatus(
    JSON.parse(readFileSync(json, 'utf8')) as SavedStatus,
  );
  return {
    svg: svgSource(
      `status/${file}`,
      status.conditional.map((c) => c.id),
    ),
    status,
  };
}

interface SavedStatus {
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
}

/// The saved labels on the halved picture's grid (see halve).
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
    },
    labels: saved.labels.map((l): Label => ({
      heater: l.heater,
      anchor: p(l.anchor),
      elbow: p(l.elbow),
      end: p(l.end),
      ...(l.when && { when: l.when }),
    })),
    conditional: saved.conditional ?? [],
  };
}

/// `keep`: ids the page looks the parts up by, which svgo would shorten.
export function svgSource(file: string, keep: readonly string[] = []): string {
  const config = {
    multipass: true,
    floatPrecision: 0,
    plugins: [
      {
        name: 'preset-default' as const,
        params: { overrides: { cleanupIds: { preserve: [...keep] } } },
      },
    ],
  };
  const flat = optimize(
    flattenGradients(readFileSync(asset(file), 'utf8')),
    config,
  ).data;
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
