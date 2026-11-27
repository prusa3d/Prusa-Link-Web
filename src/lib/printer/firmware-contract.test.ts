import { describe, expect, it } from 'vitest';

import { fitsPrinter } from './compat';
import fixtures from './fixtures/firmware-checks.json';
import { checkGroup, resolve, TITLES } from './print-check';
import {
  gcodeFilaments,
  type PrinterTool,
  type Severity,
} from './tool-mapping';

/// The page's checks against what the firmware reports for the same print
/// (fixtures/firmware-checks.json, read from Buddy's rules): every check
/// the printer lists the page says too, at the same level and about the
/// same tool, and nothing more. Checks that say the same thing in other
/// words (an empty tool also has "another filament") count as one.

interface Case {
  name: string;
  header: Record<string, string>;
  tools: {
    material?: string;
    disabled?: boolean;
    hardened?: boolean;
    nozzle?: number;
  }[];
  mapping: Record<string, number[]>;
  nozzleCheck?: string;
  modelCheck?: string;
  printer?: string;
  checks: {
    check: string;
    level: string;
    tool?: number;
    gcode_tool?: number;
  }[];
}

const key = (group: string, level: string, about: string) =>
  `${group} | ${level} | ${about}`;

describe('the page judges a print as the firmware does', () => {
  it.each(fixtures.cases as Case[])('$name', (c) => {
    const slots: PrinterTool[] = c.tools.map((t, i) => ({
      index: i + 1,
      id: String(i),
      material: t.material,
      nozzle: t.nozzle ?? 0.4,
      hardened: t.hardened ?? false,
      highFlow: false,
      disabled: t.disabled ?? false,
    }));
    const r = resolve(
      gcodeFilaments(c.header),
      Object.fromEntries(
        Object.entries(c.mapping).map(([k, v]) => [Number(k), v]),
      ),
      {
        slots,
        nozzleCheck: c.nozzleCheck as Severity | undefined,
        modelCheck: c.modelCheck as Severity | undefined,
        modelFits: fitsPrinter(c.header.printer_model, c.printer ?? '3.1.0'),
      },
    );
    const page = new Set(
      r.issues.map((i) => {
        let about = '';
        if (i.slot !== undefined) about = `T${String(i.slot)}`;
        else if (i.key === 'unmapped') about = `G${String(i.filament)}`;
        return key(checkGroup(TITLES[i.key]), i.level, about);
      }),
    );
    const firmware = new Set(
      c.checks.map((x) => {
        let about = '';
        if (x.tool !== undefined) about = `T${String(x.tool)}`;
        else if (x.gcode_tool !== undefined) about = `G${String(x.gcode_tool)}`;
        return key(checkGroup(x.check), x.level, about);
      }),
    );
    expect([...page].sort()).toEqual([...firmware].sort());
    expect(r.state === 'abort').toBe(c.checks.some((x) => x.level === 'abort'));
  });
});
