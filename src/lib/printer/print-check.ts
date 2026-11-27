import { BASIC_FILAMENTS, OTHER_FILAMENTS } from './filaments';
import {
  checks,
  colourDistance,
  type GcodeFilament,
  type Mapping,
  type PrinterTool,
  SAME_COLOUR,
  sameFilament,
  type Severity,
} from './tool-mapping';

/// What the printer will make of a print with a tool mapping, by the
/// firmware's own checks and levels (src/feature/compatibility_checks/
/// gcode_compatibility.cpp in Buddy): each check is a warning the person
/// may print through, or an abort; HW checks take the level the printer is
/// set to (hw_checks in /api/v1/info). Every rule is here, to be adjusted
/// in one place. The page's verdict is advice: the printer's own report
/// (GET /api/v1/print/checks) decides.

export type Level = 'warning' | 'abort';

/// A firmware check that fails, by its name (the message key
/// `print.check.<key>`), with what the message says about it.
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
  /// The slot it is about, its number.
  slot?: number;
  /// What the slot has: its filament, or its nozzle in mm.
  has?: string;
  /// What the file needs.
  needs?: string;
}

/// How a mapped slot suits its G-code filament.
export type RowStatus =
  'match' | 'colour' | 'change' | 'empty' | 'incompatible' | 'unmapped';

export interface Backup {
  slot: PrinterTool;
  status: RowStatus;
}

export interface Row {
  filament: GcodeFilament;
  slot?: PrinterTool | undefined;
  status: RowStatus;
  /// Spool join backups, judged against the same G-code filament.
  backups: Backup[];
}

/// What to do: print, change filaments first (or print anyway, all being
/// warnings), print anyway through warnings, or nothing.
export type State = 'ok' | 'change' | 'warning' | 'abort';

export interface Resolution {
  rows: Row[];
  issues: Issue[];
  /// The slots, primaries and backups, whose filament must change for the
  /// print, to the G-code filament.
  changes: { slot: PrinterTool; to: GcodeFilament }[];
  /// G-code filaments a change cannot load: the printer has no such
  /// filament (another slicer's name, or none in the file).
  unloadable: GcodeFilament[];
  state: State;
}

export interface Printer {
  slots: readonly PrinterTool[];
  /// hw_checks; a firmware that does not say warns.
  nozzleCheck?: Severity | undefined;
  modelCheck?: Severity | undefined;
  /// The file is for this printer (false), or unknown (undefined).
  modelFits?: boolean | undefined;
}

export { SAME_COLOUR };

/// The firmware's title of each check, as /api/v1/print/checks names them.
export const TITLES: Readonly<Record<Issue['key'], string>> = {
  model: 'Incompatible printer model',
  notEnoughTools: 'Not enough tools',
  unmapped: 'Unmapped tool',
  wrongTool: 'Wrong tool',
  nozzleDiameter: 'Wrong nozzle diameter',
  nozzleHardened: 'Nozzle not hardened',
  nozzleHighFlow: 'Nozzle not high-flow',
  filamentNotLoaded: 'Filament not loaded',
  wrongFilament: 'Wrong filament type',
};

/// Firmware checks that say what another one says for the same tool: an
/// empty tool also has "another filament type"; an MMU's head fails its
/// own high-flow check with the per-tool one.
const ALIKE: Readonly<Record<string, string>> = {
  'Wrong filament type': 'Filament not loaded',
  'Nozzle high-flow mismatch': 'Nozzle not high-flow',
};

/// A check's title, or the title of the check it repeats.
export const checkGroup = (title: string) => ALIKE[title] ?? title;

const PRESETS: readonly string[] = [...BASIC_FILAMENTS, ...OTHER_FILAMENTS];

const level = (s: Severity | undefined): Level | undefined => {
  if (s === 'ignore') return undefined;
  return s === 'abort' ? 'abort' : 'warning';
};

/// One slot for one G-code filament: its status and the checks it fails.
export function judge(
  f: GcodeFilament,
  slot: PrinterTool,
  nozzleCheck: Severity | undefined,
): { status: RowStatus; issues: Issue[] } {
  const about = { filament: f.index, slot: slot.index };
  if (slot.disabled)
    return {
      status: 'incompatible',
      issues: [{ key: 'wrongTool', level: 'abort', ...about }],
    };
  const issues: Issue[] = [];
  const nozzle = level(nozzleCheck);
  const failed = checks(f, slot, nozzleCheck ?? 'warning').rules;
  if (nozzle) {
    if (failed.includes('nozzle_diameter'))
      issues.push({
        key: 'nozzleDiameter',
        level: nozzle,
        ...about,
        has: String(slot.nozzle),
        needs: String(f.nozzle),
      });
    if (failed.includes('nozzle_hardened'))
      issues.push({ key: 'nozzleHardened', level: nozzle, ...about });
    if (failed.includes('nozzle_high_flow'))
      issues.push({ key: 'nozzleHighFlow', level: nozzle, ...about });
  }
  if (nozzle === 'abort' && issues.length)
    return { status: 'incompatible', issues };
  if (!slot.material) {
    issues.push({
      key: 'filamentNotLoaded',
      level: 'warning',
      ...about,
      needs: f.material,
    });
    return { status: 'empty', issues };
  }
  if (!sameFilament(f.material, slot.material)) {
    issues.push({
      key: 'wrongFilament',
      level: 'warning',
      ...about,
      has: slot.material,
      needs: f.material,
    });
    return { status: 'change', issues };
  }
  const d = colourDistance(f.color, slot.color);
  return {
    status: Number.isFinite(d) && d > SAME_COLOUR ? 'colour' : 'match',
    issues,
  };
}

/// What `slot` is to filament `f` on its own: a match, another colour, a
/// filament to change or load, or impossible by the printer's rules.
export const statusOf = (
  f: GcodeFilament,
  slot: PrinterTool,
  nozzleCheck: Severity | undefined,
): RowStatus => judge(f, slot, nozzleCheck).status;

const needsChange = (s: RowStatus) => s === 'change' || s === 'empty';

export function resolve(
  filaments: readonly GcodeFilament[],
  mapping: Mapping,
  printer: Printer,
): Resolution {
  const issues: Issue[] = [];
  const present = printer.slots.filter((s) => !s.disabled);

  const model = printer.modelFits === false && level(printer.modelCheck);
  if (model) issues.push({ key: 'model', level: model });
  // A fixed warning: a single-nozzle print may change filament with M600.
  if (filaments.length > Math.max(present.length, 1))
    issues.push({
      key: 'notEnoughTools',
      level: 'warning',
      has: String(Math.max(present.length, 1)),
      needs: String(filaments.length),
    });

  const changes: Resolution['changes'] = [];
  const slotOf = (n: number) => printer.slots.find((s) => s.index === n);
  const rows: Row[] = filaments.map((f) => {
    // A single-tool printer maps nothing.
    if (!printer.slots.length)
      return { filament: f, status: 'match', backups: [] };
    const [first, ...rest] = mapping[f.index] ?? [];
    const slot = first === undefined ? undefined : slotOf(first);
    if (!slot) {
      issues.push({ key: 'unmapped', level: 'abort', filament: f.index });
      return { filament: f, status: 'unmapped', backups: [] };
    }
    const backups = rest.flatMap((n) => {
      const b = slotOf(n);
      return b ? [b] : [];
    });
    const judged = [slot, ...backups].map((s) => {
      const j = judge(f, s, printer.nozzleCheck);
      issues.push(...j.issues);
      if (needsChange(j.status)) changes.push({ slot: s, to: f });
      return { slot: s, status: j.status };
    });
    const [own, ...joins] = judged;
    return {
      filament: f,
      slot,
      status: own?.status ?? 'unmapped',
      backups: joins,
    };
  });

  const unloadable = [
    ...new Map(
      changes
        .filter(({ to }) => !PRESETS.includes(to.material))
        .map(({ to }) => [to.index, to]),
    ).values(),
  ];
  let state: State = 'ok';
  if (issues.some((i) => i.level === 'abort')) state = 'abort';
  else if (changes.length) state = 'change';
  else if (issues.length) state = 'warning';
  return { rows, issues, changes, unloadable, state };
}

/// Slots a filament's spool may join to after `primary`: the nozzle and
/// nozzle flags of the primary, none another filament prints from or
/// joins to, and one the printer would take for this G-code filament.
export function joinable(
  f: GcodeFilament,
  primary: PrinterTool,
  slots: readonly PrinterTool[],
  mapping: Mapping,
  nozzleCheck?: Severity,
): PrinterTool[] {
  const used = new Set(Object.values(mapping).flat());
  return slots.filter(
    (s) =>
      !s.disabled &&
      s.index !== primary.index &&
      !used.has(s.index) &&
      s.nozzle === primary.nozzle &&
      !!s.hardened === !!primary.hardened &&
      !!s.highFlow === !!primary.highFlow &&
      !!s.highTemp === !!primary.highTemp &&
      statusOf(f, s, nozzleCheck) !== 'incompatible',
  );
}

/// The mapping without backups that no longer suit their filament's
/// primary (after the primary changed).
export function prune(
  mapping: Mapping,
  filaments: readonly GcodeFilament[],
  slots: readonly PrinterTool[],
  nozzleCheck?: Severity,
): Mapping {
  const out: Mapping = {};
  for (const [key, [first, ...rest]] of Object.entries(mapping)) {
    if (first === undefined) continue;
    const f = filaments.find((x) => x.index === Number(key));
    const primary = slots.find((s) => s.index === first);
    const kept = rest.filter((n) => {
      if (!f || !primary) return false;
      const others = { ...mapping, [key]: [first] };
      return joinable(f, primary, slots, others, nozzleCheck).some(
        (s) => s.index === n,
      );
    });
    out[Number(key)] = [first, ...kept];
  }
  return out;
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
  return { rows: [], issues, changes: [], unloadable: [], state };
}
