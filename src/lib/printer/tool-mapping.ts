import type { Header } from '../files/header';
import { firmwareFilament } from './filaments';

/// Which printer tool prints which G-code extruder, as Prusa Connect's
/// start-print tool mapping: extruders and tools are 1-based, the first tool
/// of an extruder prints it and the rest are its spool-join backups.

/// An extruder the file uses, from its header.
export interface GcodeFilament {
  index: number;
  material: string;
  color?: string | undefined;
  grams?: number | undefined;
  nozzle?: number | undefined;
  highFlow?: boolean | undefined;
  abrasive?: boolean | undefined;
}

/// A tool of the printer (a head, or an MMU slot), from /api/v1/info.
export interface PrinterTool {
  index: number;
  /// Connect's tool id in /api/v1/info: `"2"`, or `"0.3"` for an MMU slot.
  id?: string | undefined;
  /// Undefined when nothing is loaded.
  material?: string | undefined;
  color?: string | undefined;
  nozzle?: number | undefined;
  hardened?: boolean | undefined;
  highFlow?: boolean | undefined;
  /// Switched off on the printer (null in /info).
  disabled?: boolean | undefined;
}

/// The printer's severity of its nozzle check (hw_checks in /info, the
/// firmware's HWCheckSeverity); firmware that does not say warns.
export type Severity = 'ignore' | 'warning' | 'abort';

export type Mapping = Record<number, number[]>;

/// How well a tool suits an extruder, for the row's badge.
export type Fit = 'exact' | 'similar' | 'material' | 'nozzle' | 'refused';

/// An extruder printing less than this is unused, as Buddy and Connect count.
const UNUSED_GRAMS = 0.03;
/// printcompat's nozzleTolerance, mm.
const NOZZLE_TOLERANCE = 0.001;
/// Below this ΔE00 two colours pass for the same.
const SAME_COLOUR = 3;

/// The extruders a file uses, as Connect's gcodeSlots builds them: a
/// per-extruder value with fewer items than extruders is not trusted, and a
/// single-extruder file has none to map.
export function gcodeFilaments(header: Header | undefined): GcodeFilament[] {
  if (!header) return [];
  const perTool = (value = '') =>
    value.split(/[,;]/).map((v) => v.trim().replace(/^"(.*)"$/, '$1'));
  const used = perTool(header['filament used [g]']).map(Number);
  if (used.length < 2) return [];
  const complete = (key: string) => {
    const values = perTool(header[key]);
    return values.length < used.length ? [] : values;
  };
  const types = complete('filament_type');
  const colours = complete('extruder_colour');
  const nozzles = complete('nozzle_diameter');
  const highFlow = complete('nozzle_high_flow');
  const abrasive = complete('filament_abrasive');
  const flag = (v: string | undefined) => (v === undefined ? v : v === '1');
  return used.flatMap((grams, i) =>
    grams >= UNUSED_GRAMS && types[i]
      ? [
          {
            index: i + 1,
            material: types[i],
            color: colours[i]?.startsWith('#') ? colours[i] : undefined,
            grams,
            nozzle: nozzles[i] ? Number(nozzles[i]) : undefined,
            highFlow: flag(highFlow[i]),
            abrasive: flag(abrasive[i]),
          },
        ]
      : [],
  );
}

/// The checks the firmware makes for one extruder on one tool
/// (gcode_compatibility, as prusa-connect's printcompat names them) that
/// fail, and how hard: a refusal never starts.
export function checks(
  f: GcodeFilament,
  t: PrinterTool,
  nozzleSeverity: Severity = 'warning',
): { rules: string[]; refused: boolean } {
  const rules: string[] = [];
  if (t.disabled) return { rules: ['tool_enabled'], refused: true };
  const nozzle: string[] = [];
  if (
    f.nozzle !== undefined &&
    t.nozzle !== undefined &&
    Math.abs(f.nozzle - t.nozzle) > NOZZLE_TOLERANCE
  )
    nozzle.push('nozzle_diameter');
  if (f.abrasive && t.hardened === false) nozzle.push('nozzle_hardened');
  if (f.highFlow && t.highFlow === false) nozzle.push('nozzle_high_flow');
  if (nozzleSeverity !== 'ignore') rules.push(...nozzle);
  if (
    !t.material ||
    firmwareFilament(t.material) !== firmwareFilament(f.material)
  )
    rules.push('material');
  return {
    rules,
    refused: nozzleSeverity === 'abort' && nozzle.length > 0,
  };
}

export function fit(
  f: GcodeFilament,
  t: PrinterTool,
  severity?: Severity,
): Fit {
  const { rules, refused } = checks(f, t, severity);
  if (refused || rules.includes('tool_enabled')) return 'refused';
  if (rules.some((r) => r.startsWith('nozzle'))) return 'nozzle';
  if (rules.includes('material')) return 'material';
  // Without both colours the material is all there is to match.
  const d = colourDistance(f.color, t.color);
  return Number.isFinite(d) && d >= SAME_COLOUR ? 'similar' : 'exact';
}

/// What a tool costs for an extruder: firmware refusals rule it out, nozzle
/// warnings come after every compatible tool, another material after the
/// same one, then the nearer colour; a tool's own number breaks ties (1:1,
/// the firmware's default).
function cost(f: GcodeFilament, t: PrinterTool, severity?: Severity) {
  const { rules, refused } = checks(f, t, severity);
  if (refused || rules.includes('tool_enabled')) return Infinity;
  let c = rules.some((r) => r.startsWith('nozzle')) ? 1000 : 0;
  if (rules.includes('material')) c += 100;
  const d = colourDistance(f.color, t.color);
  c += Number.isFinite(d) ? Math.min(d, 99) : 25;
  return c + (f.index === t.index ? 0 : 0.001);
}

/// Leaving an extruder for the person to map costs more than any tool.
const UNMAPPED = 1e6;

/// The mapping with the lowest total cost, every tool used at most once:
/// an exhaustive search, which a printer's few tools allow. Extruders no
/// tool can print stay unmapped.
export function suggest(
  filaments: readonly GcodeFilament[],
  tools: readonly PrinterTool[],
  severity?: Severity,
): Mapping {
  const costs = filaments.map((f) => tools.map((t) => cost(f, t, severity)));
  let best = { total: Infinity, picks: [] as number[] };
  const taken = new Set<number>();
  const picks: number[] = [];
  const walk = (i: number, total: number) => {
    if (total >= best.total) return;
    if (i === filaments.length) {
      best = { total, picks: [...picks] };
      return;
    }
    for (const [j, c] of (costs[i] ?? []).entries()) {
      if (taken.has(j) || !Number.isFinite(c)) continue;
      taken.add(j);
      picks.push(j);
      walk(i + 1, total + c);
      picks.pop();
      taken.delete(j);
    }
    picks.push(-1);
    walk(i + 1, total + UNMAPPED);
    picks.pop();
  };
  walk(0, 0);
  const out: Mapping = {};
  best.picks.forEach((j, i) => {
    const f = filaments[i];
    const t = tools[j];
    if (f && t) out[f.index] = [t.index];
  });
  return out;
}

export interface ChangeItem {
  action: 'change';
  /// A preset or user filament name, as the firmware calls it.
  filament: string;
  color?: string;
}

/// What the printer's change all should load so the mapped slots hold the
/// file's filaments, by Connect tool id: every slot whose material or
/// colour differs, or just slot `only`, whatever it holds.
export function changeItems(
  filaments: readonly GcodeFilament[],
  slots: readonly PrinterTool[],
  mapping: Mapping,
  only?: number,
): Record<string, ChangeItem> {
  const out: Record<string, ChangeItem> = {};
  for (const f of filaments) {
    const first = mapping[f.index]?.[0];
    if (first === undefined || (only !== undefined && first !== only)) continue;
    const slot = slots.find((s) => s.index === first);
    if (!slot?.id) continue;
    const d = colourDistance(f.color, slot.color);
    const same =
      !!slot.material &&
      firmwareFilament(slot.material) === firmwareFilament(f.material) &&
      !(Number.isFinite(d) && d >= SAME_COLOUR);
    if (only === undefined && same) continue;
    out[slot.id] = {
      action: 'change',
      filament: firmwareFilament(f.material),
      ...(f.color && { color: f.color }),
    };
  }
  return out;
}

/// The body's `tool_mapping`, as Connect sends it.
export const toApi = (mapping: Mapping) =>
  Object.fromEntries(
    Object.entries(mapping)
      .filter(([, to]) => to.length)
      .map(([from, to]) => [from, to]),
  ) as Record<string, number[]>;

/// CIEDE2000 colour difference of two `#rrggbb` colours; Infinity when
/// either is missing.
export function colourDistance(a?: string, b?: string): number {
  const x = lab(a);
  const y = lab(b);
  if (!x || !y) return Infinity;
  return ciede2000(x, y);
}

export type Lab = [number, number, number];

function lab(hex: string | undefined): Lab | undefined {
  const m = /^#?([0-9a-f]{6})/i.exec(hex ?? '');
  if (!m?.[1]) return undefined;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s > 0.04045 ? ((s + 0.055) / 1.055) ** 2.4 : s / 12.92;
  }) as Lab;
  // sRGB to XYZ (D65), normalised to the white point.
  const f = (t: number) =>
    t > 216 / 24389 ? Math.cbrt(t) : (t * 24389) / 27 / 116 + 16 / 116;
  const fx = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const fy = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const fz = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/// Sharma, Wu and Dalal's formulation, with kL = kC = kH = 1.
export function ciede2000([l1, a1, b1]: Lab, [l2, a2, b2]: Lab): number {
  const rad = Math.PI / 180;
  const c1 = Math.hypot(a1, b1);
  const c2 = Math.hypot(a2, b2);
  const cm = (c1 + c2) / 2;
  const g = 0.5 * (1 - Math.sqrt(cm ** 7 / (cm ** 7 + 25 ** 7)));
  const ap1 = a1 * (1 + g);
  const ap2 = a2 * (1 + g);
  const cp1 = Math.hypot(ap1, b1);
  const cp2 = Math.hypot(ap2, b2);
  const hue = (b: number, a: number) => {
    if (a === 0 && b === 0) return 0;
    const h = Math.atan2(b, a) / rad;
    return h < 0 ? h + 360 : h;
  };
  const hp1 = hue(b1, ap1);
  const hp2 = hue(b2, ap2);
  const dl = l2 - l1;
  const dc = cp2 - cp1;
  let dh = 0;
  if (cp1 * cp2 !== 0) {
    dh = hp2 - hp1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(cp1 * cp2) * Math.sin((dh / 2) * rad);
  const lm = (l1 + l2) / 2;
  const cpm = (cp1 + cp2) / 2;
  let hm = hp1 + hp2;
  if (cp1 * cp2 !== 0) {
    if (Math.abs(hp1 - hp2) <= 180) hm /= 2;
    else hm = hp1 + hp2 < 360 ? (hm + 360) / 2 : (hm - 360) / 2;
  }
  const t =
    1 -
    0.17 * Math.cos((hm - 30) * rad) +
    0.24 * Math.cos(2 * hm * rad) +
    0.32 * Math.cos((3 * hm + 6) * rad) -
    0.2 * Math.cos((4 * hm - 63) * rad);
  const sl = 1 + (0.015 * (lm - 50) ** 2) / Math.sqrt(20 + (lm - 50) ** 2);
  const sc = 1 + 0.045 * cpm;
  const sh = 1 + 0.015 * cpm * t;
  const rt =
    -2 *
    Math.sqrt(cpm ** 7 / (cpm ** 7 + 25 ** 7)) *
    Math.sin(60 * Math.exp(-(((hm - 275) / 25) ** 2)) * rad);
  return Math.sqrt(
    (dl / sl) ** 2 +
      (dc / sc) ** 2 +
      (dH / sh) ** 2 +
      rt * (dc / sc) * (dH / sh),
  );
}
