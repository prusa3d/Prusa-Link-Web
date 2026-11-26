/// A status picture's bed area, drawn over the picture's bed and under the
/// labels: dark grey at room temperature, the brand orange at the top of the
/// bed's scale. Kept free of imports: the picture editor draws it too.

/// In the picture's units; `rx` rounds the corners.
export interface Bed {
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
}

const AMBIENT = 25;

/// The firmware knows each material's bed temperature, but PrusaLink does
/// not report it yet (a future /api/v1/status field would be the better top).
const DEFAULT_TOP = 110;

let lastTarget = 0;

/// The temperature the bed glows fully orange at: its target, else the last
/// target seen this session, else a hot PETG/ABS bed.
export function bedTop(target: number | null | undefined): number {
  if (target && target > 0) lastTarget = target;
  return lastTarget || DEFAULT_TOP;
}

/// How far from room temperature to `top` the bed is, 0 to 1.
export function bedHeat(current: number, top: number): number {
  const f = (current - AMBIENT) / Math.max(top - AMBIENT, 1);
  return Math.min(1, Math.max(0, f));
}

/// Dark grey mixed with the brand orange by `heat`, with a glow as hot.
export function bedStyle(heat: number): string {
  const orange = 'var(--color-orange-light-9)';
  return `fill:color-mix(in oklab,${orange} ${String(Math.round(heat * 100))}%,#3a3a3c);filter:drop-shadow(0 0 ${String(Math.round(heat * 6))}px ${orange})`;
}
