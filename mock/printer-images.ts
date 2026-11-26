import { readFileSync } from 'node:fs';

import { optimize } from 'svgo';
import svgpath from 'svgpath';
import type { Plugin } from 'vite';

import type { Variant } from '../src/lib/printer/models';

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

/// `virtual:printer-images` exports `{ images: { [variant]: svg } }`: every
/// picture in the dev server, only `variant`'s in a printer build, and the
/// CORE One's in the generic build, where it stands for every printer. SVGs
/// are optimised to whole pixels.
export function printerImages(variant: string | undefined): Plugin {
  return {
    name: 'prusalink-printer-images',
    resolveId(id) {
      return id === ID ? `\0${ID}` : undefined;
    },
    load(id) {
      if (id !== `\0${ID}`) return undefined;
      const pick = variant === 'generic' ? 'coreone' : variant;
      const entries = Object.entries(PRINTER_IMAGES).filter(
        ([v]) => !pick || v === pick,
      );
      const images = Object.fromEntries(
        entries.map(([v, file]) => [v, svgSource(file)]),
      );
      return `export default ${JSON.stringify({ images })};`;
    },
  };
}

export function svgSource(file: string): string {
  const path = new URL(`../assets/printers/${file}`, import.meta.url);
  const flat = optimize(flattenGradients(readFileSync(path, 'utf8')), {
    multipass: true,
    floatPrecision: 0,
  }).data;
  const { data } = optimize(halve(flat), {
    multipass: true,
    floatPrecision: 0,
  });
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
        /stroke-width="([\d.]+)"/g,
        (_, w: string) => `stroke-width="${String(Number(w) / 2)}"`,
      )
      .replace(/<svg([^>]*)>/, (_, attrs: string) => {
        const kept = attrs.replace(/ (?:width|height|viewBox)="[^"]*"/g, '');
        return `<svg${kept} width="500" height="500" viewBox="0 0 500 500">`;
      })
  );
}
