/// A status picture's heated areas, the bed and the chamber, drawn over the
/// picture and under the labels: dark grey at room temperature, the brand
/// orange at the top of the area's scale. Kept free of imports: the picture
/// editor draws them too.

/// In the picture's units; `rx` rounds the corners.
export interface Bed {
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
}

/// A part the app draws over the picture, on the built picture's grid: a
/// copy of the picture's own part, outlined as it was, or a rectangle.
export interface Shape {
  d: string;
  /// Drawn only when this holds (status-picture.ts `met`), as the part of
  /// the picture it copies.
  when?: string;
  fill?: string;
  opacity?: number;
  'fill-rule'?: 'evenodd';
  stroke?: string;
  'stroke-width'?: number;
  'stroke-linejoin'?: 'miter' | 'round' | 'bevel';
}

const AMBIENT = 25;

/// The temperature an area glows fully orange at: its target, else the last
/// target seen this session, else `fallback`.
function topOf(fallback: number) {
  let last = 0;
  return (target: number | null | undefined): number => {
    if (target && target > 0) last = target;
    return last || fallback;
  };
}

/// The firmware knows each material's bed temperature, but PrusaLink does
/// not report it yet (a future /api/v1/status field would be the better
/// top): a hot PETG/ABS bed.
export const bedTop = topOf(110);

/// The highest chamber target the CORE One takes (the firmware's chamber
/// limit, 60 ℃, less its 5 ℃ safety margin; the CORE One L takes 60 ℃).
export const chamberTop = topOf(55);

/// How far from room temperature to `top` an area is, 0 to 1.
export function bedHeat(current: number, top: number): number {
  const f = (current - AMBIENT) / Math.max(top - AMBIENT, 1);
  return Math.min(1, Math.max(0, f));
}

const ORANGE = 'var(--color-orange-light-9)';

/// Dark grey mixed with the brand orange by `heat`.
export function bedFill(heat: number): string {
  return `color-mix(in oklab,${ORANGE} ${String(Math.round(heat * 100))}%,#3a3a3c)`;
}

/// A glow that grows as the area gets hot.
export function bedGlow(heat: number): string {
  return `drop-shadow(0 0 ${String(Math.round(heat * 6))}px ${ORANGE})`;
}

export function bedStyle(heat: number): string {
  return `fill:${bedFill(heat)};filter:${bedGlow(heat)}`;
}

/// A status light in `color`: see-through, glowing softly around it; with
/// no state to show, the grey of a cold bed, unlit.
export function statusStyle(color?: string): string {
  if (!color) return 'fill:#3a3a3c';
  const glow = (blur: number) => `drop-shadow(0 0 ${String(blur)}px ${color})`;
  return `fill:${color};fill-opacity:.6;filter:${glow(1.5)} ${glow(3.5)}`;
}
