import type { components } from '../src/lib/api/schema';
import { fitsPrinter } from '../src/lib/printer/compat.ts';
import { type Issue, resolve, TITLES } from '../src/lib/printer/print-check.ts';
import {
  gcodeFilaments,
  type Mapping,
  type PrinterTool,
} from '../src/lib/printer/tool-mapping.ts';
import { type MockFile, type MockPrinter, PRINTER_CODE } from './printer.ts';

export type Report = components['schemas']['PrintChecks'];

/// The firmware's descriptions (gcode_compatibility.cpp), for `text`.
const TEXTS: Partial<Record<Issue['key'], string>> = {
  model: 'G-Code is sliced for a different printer and is not compatible.',
  notEnoughTools: 'G-Code requires more tools than are currently enabled.',
  unmapped: 'G-Code tool is not mapped.',
  wrongTool: 'Tool is disabled or of a different type.',
  nozzleDiameter: 'G-Code is sliced for a different tool diameter.',
  nozzleHardened:
    'G-Code is sliced for a hardened nozzle. Non-hardened nozzles can get damaged due to material abrasivity.',
  nozzleHighFlow:
    'G-Code is sliced for a high-flow nozzle. Printing with standard nozzle can lead to underextrusion and extruder skipping.',
  filamentNotLoaded:
    'One of the used tools does not have a filament loaded. Filament sensors need to be disabled for the print.',
  wrongFilament:
    'G-Code is sliced for a different filament type than what is currently loaded in the assigned tool.',
};

/// The printer's slots as the page's checks see them: a feeder slot has
/// the head's nozzle.
export function mappingSlots(printer: MockPrinter): PrinterTool[] {
  const head = printer.nozzle;
  return printer.targets.map(({ id, tool }, i) => ({
    index: i + 1,
    id,
    material:
      tool.material === '---' || tool.absent ? undefined : tool.material,
    color: tool.color,
    nozzle: 0.4,
    hardened: head.hardened,
    highFlow: head.highFlow,
    highTemp: head.highTemp,
    disabled: !!tool.absent,
  }));
}

/// The mapping the printer starts with when none comes: each G-code tool
/// on the tool of its number, where there is one.
export function defaultMapping(printer: MockPrinter, file: MockFile): Mapping {
  const slots = mappingSlots(printer);
  return Object.fromEntries(
    gcodeFilaments(printer.header(file))
      .filter((f) => slots.some((s) => s.index === f.index && !s.disabled))
      .map((f) => [f.index, [f.index]]),
  );
}

/// The firmware's CompatibilityReport for a print, from the page's own
/// rules (src/lib/printer/print-check.ts): the mock is not the judge, the
/// printer is.
export function report(
  printer: MockPrinter,
  file: MockFile,
  mapping: Mapping,
  maps: boolean,
): Report {
  const header = printer.header(file);
  const slots = mappingSlots(printer);
  const r = resolve(gcodeFilaments(header), mapping, {
    slots: maps ? slots : [],
    nozzleCheck: printer.nozzleCheck,
    modelCheck: printer.modelCheck,
    modelFits: fitsPrinter(header?.printer_model, PRINTER_CODE[printer.model]),
  });
  const checks = r.issues.map((i) => {
    const text = TEXTS[i.key];
    const tool = slots.find((s) => s.index === i.slot)?.id;
    return {
      check: TITLES[i.key],
      level: i.level,
      ...(tool !== undefined && { tool }),
      ...(i.filament !== undefined && !tool && { gcode_tool: i.filament }),
      ...(text && { text }),
    };
  });
  const abort = checks.some((c) => c.level === 'abort');
  let level: Report['level'] = checks.length ? 'warning' : 'ok';
  if (abort) level = 'abort';
  return { printable: !abort, level, checks };
}

/// Like the firmware's validate_tool_mapping: G-code tools and printer
/// tools in range, no printer tool twice (as two G-code tools' target, or
/// one's backup and another's primary). The reason, undefined when fine.
export function invalidMapping(
  printer: MockPrinter,
  mapping: Record<string, unknown>,
): string | undefined {
  const used = new Set<number>();
  for (const [from, to] of Object.entries(mapping)) {
    if (!/^[1-9]\d*$/.test(from) || !Array.isArray(to) || !to.length)
      return 'Invalid tools mapping';
    for (const tool of to) {
      if (typeof tool !== 'number' || tool < 1) return 'Invalid tools mapping';
      if (tool > printer.targets.length) return 'Tool index out of range';
      if (used.has(tool)) return 'Invalid tools mapping';
      used.add(tool);
    }
  }
  return undefined;
}

/// `1:3:5,2:1` (the query of /print/checks) as a mapping; undefined when
/// malformed.
export function parseMapping(text: string): Mapping | undefined {
  const out: Mapping = {};
  for (const entry of text.split(',')) {
    const [from, ...to] = entry.split(':').map(Number);
    if (
      from === undefined ||
      !to.length ||
      ![from, ...to].every((n) => Number.isInteger(n) && n > 0)
    )
      return undefined;
    out[from] = to;
  }
  return out;
}
