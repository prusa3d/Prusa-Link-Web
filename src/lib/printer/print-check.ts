import { firmwareFilament } from './filaments';
import {
  checks,
  colourDistance,
  type GcodeFilament,
  type Mapping,
  type PrinterTool,
  type Severity,
} from './tool-mapping';

/// What the printer will make of a print with a tool mapping, by the
/// firmware's own checks and levels (src/feature/compatibility_checks/
/// gcode_compatibility.cpp in Buddy): each check is a warning the person
/// may print through, or an abort; HW checks take the level the printer is
/// set to (hw_checks in /api/v1/info). Every rule is here, to be adjusted
/// in one place.

export type Level = 'warning' | 'abort';

/// A firmware check that fails, by its name (the message key `check.<key>`).
export interface Issue {
  key:
    | 'model'
    | 'notEnoughTools'
    | 'unmapped'
    | 'wrongTool'
    | 'nozzleDiameter'
    | 'nozzleHardened'
    | 'nozzleHighFlow'
    | 'filamentNotLoaded'
    | 'wrongFilament';
  level: Level;
  /// The G-code filament (1-based) it is about.
  filament?: number;
}

/// How a mapped slot suits its G-code filament.
export type RowStatus =
  'match' | 'colour' | 'change' | 'empty' | 'incompatible' | 'unmapped';

export interface Row {
  filament: GcodeFilament;
  slot?: PrinterTool | undefined;
  status: RowStatus;
}

/// What to do: print, change filaments first (or print anyway, all being
/// warnings), print anyway through warnings, or nothing.
export type State = 'ok' | 'change' | 'warning' | 'abort';

export interface Resolution {
  rows: Row[];
  issues: Issue[];
  /// The slots whose filament must change for the print: by slot number,
  /// to the G-code filament.
  changes: { slot: PrinterTool; to: GcodeFilament }[];
  state: State;
}

export interface Printer {
  slots: readonly PrinterTool[];
  /// hw_checks; a firmware that does not say warns.
  nozzleCheck?: Severity;
  modelCheck?: Severity;
  /// The file is for this printer (false), or unknown (undefined).
  modelFits?: boolean | undefined;
}

/// Below this CIEDE2000 distance two colours count as the same.
export const SAME_COLOUR = 10;

const level = (s: Severity | undefined): Level | undefined => {
  if (s === 'ignore') return undefined;
  return s === 'abort' ? 'abort' : 'warning';
};

/// What `slot` is to filament `f` on its own: a match, another colour, a
/// filament to change or load, or impossible by the printer's rules.
export function statusOf(
  f: GcodeFilament,
  slot: PrinterTool,
  nozzleCheck: Severity | undefined,
): RowStatus {
  if (slot.disabled) return 'incompatible';
  const failed = checks(f, slot, nozzleCheck ?? 'warning').rules;
  if (
    level(nozzleCheck) === 'abort' &&
    failed.some((r) => r.startsWith('nozzle'))
  )
    return 'incompatible';
  if (!slot.material) return 'empty';
  if (firmwareFilament(slot.material) !== firmwareFilament(f.material))
    return 'change';
  const d = colourDistance(f.color, slot.color);
  return Number.isFinite(d) && d > SAME_COLOUR ? 'colour' : 'match';
}

export function resolve(
  filaments: readonly GcodeFilament[],
  mapping: Mapping,
  printer: Printer,
): Resolution {
  const issues: Issue[] = [];
  const add = (key: Issue['key'], l: Level | undefined, filament?: number) => {
    if (l) issues.push({ key, level: l, ...(filament && { filament }) });
  };
  const present = printer.slots.filter((s) => !s.disabled);

  if (printer.modelFits === false) add('model', level(printer.modelCheck));
  // A fixed warning: a single-nozzle print may change filament with M600.
  if (filaments.length > Math.max(present.length, 1))
    add('notEnoughTools', 'warning');

  const changes: Resolution['changes'] = [];
  const rows: Row[] = filaments.map((f) => {
    const slot = printer.slots.find((s) => s.index === mapping[f.index]?.[0]);
    // A single-tool printer maps nothing.
    if (!printer.slots.length) return { filament: f, status: 'match' };
    if (!slot) {
      add('unmapped', 'abort', f.index);
      return { filament: f, status: 'unmapped' };
    }
    if (slot.disabled) {
      add('wrongTool', 'abort', f.index);
      return { filament: f, slot, status: 'incompatible' };
    }
    const nozzle = level(printer.nozzleCheck);
    const failed = checks(f, slot, printer.nozzleCheck ?? 'warning').rules;
    for (const rule of failed) {
      if (rule === 'nozzle_diameter') add('nozzleDiameter', nozzle, f.index);
      if (rule === 'nozzle_hardened') add('nozzleHardened', nozzle, f.index);
      if (rule === 'nozzle_high_flow') add('nozzleHighFlow', nozzle, f.index);
    }
    if (nozzle === 'abort' && failed.some((r) => r.startsWith('nozzle')))
      return { filament: f, slot, status: 'incompatible' };
    if (!slot.material) {
      changes.push({ slot, to: f });
      add('filamentNotLoaded', 'warning', f.index);
      return { filament: f, slot, status: 'empty' };
    }
    if (firmwareFilament(slot.material) !== firmwareFilament(f.material)) {
      changes.push({ slot, to: f });
      add('wrongFilament', 'warning', f.index);
      return { filament: f, slot, status: 'change' };
    }
    const d = colourDistance(f.color, slot.color);
    return {
      filament: f,
      slot,
      status: Number.isFinite(d) && d > SAME_COLOUR ? 'colour' : 'match',
    };
  });

  let state: State = 'ok';
  if (issues.some((i) => i.level === 'abort')) state = 'abort';
  else if (changes.length) state = 'change';
  else if (issues.length) state = 'warning';
  return { rows, issues, changes, state };
}

/// Slots a filament's spool may join to: the same filament type, nozzle
/// and nozzle flags as its slot; only the colour may differ.
export function joinable(
  slot: PrinterTool,
  slots: readonly PrinterTool[],
  used: readonly number[],
): PrinterTool[] {
  return slots.filter(
    (s) =>
      !s.disabled &&
      s.index !== slot.index &&
      !used.includes(s.index) &&
      !!s.material &&
      !!slot.material &&
      firmwareFilament(s.material) === firmwareFilament(slot.material) &&
      s.nozzle === slot.nozzle &&
      !!s.hardened === !!slot.hardened &&
      !!s.highFlow === !!slot.highFlow &&
      !!s.highTemp === !!slot.highTemp,
  );
}

/// Puts `slot` first for filament `from` (undefined unmaps it). A filament
/// that printed from `slot` takes `from`'s old slot instead: a swap. A
/// backup on `slot` is dropped.
export function choose(
  mapping: Mapping,
  from: number,
  slot: number | undefined,
): Mapping {
  const old = mapping[from]?.[0];
  const next: Mapping = {};
  for (const [key, to] of Object.entries(mapping)) {
    const f = Number(key);
    if (f === from) continue;
    const [first, ...backups] = to;
    const head = first === slot ? old : first;
    const list = [
      ...(head === undefined ? [] : [head]),
      ...backups.filter((x) => x !== slot),
    ];
    if (list.length) next[f] = list;
  }
  if (slot !== undefined)
    next[from] = [
      slot,
      ...(mapping[from]?.slice(1) ?? []).filter((x) => x !== slot),
    ];
  return next;
}

/// The checks a printer without tool mapping makes from the page's side:
/// the file's printer model, by the printer's own level.
export function resolveModel(printer: Printer): Resolution {
  const l = printer.modelFits === false ? level(printer.modelCheck) : undefined;
  const issues: Issue[] = l ? [{ key: 'model', level: l }] : [];
  let state: State = 'ok';
  if (l) state = l === 'abort' ? 'abort' : 'warning';
  return { rows: [], issues, changes: [], state };
}
