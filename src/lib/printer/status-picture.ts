import { inUnit, unitSign } from '../units.svelte';
import type { Bed } from './bed-heat';

/// The labels a status picture carries (assets/printers/status, saved by the
/// picture editor): one leader per heater, from the part it names to the
/// line its reading sits on. Coordinates are in the built picture's units.

export type Heater =
  'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'T8' | 'bed' | 'chamber';

/// When a part or a label shows: with an MMU, with an enclosure, when the
/// printer reports a chamber temperature, or with at least N tools.
export type Condition = 'mmu' | 'enclosure' | 'chamber' | `tools>=${number}`;

export type Point = [number, number];

export interface Label {
  heater: Heater;
  anchor: Point;
  elbow: Point;
  /// Always at the elbow's height.
  end: Point;
  when?: Condition;
}

/// The value's and the caption's font size and the leader's width.
export interface LabelStyle {
  value: number;
  caption: number;
  stroke: number;
}

export interface PictureStatus {
  style: LabelStyle;
  labels: Label[];
  /// Parts of the picture shown only under a condition, by element id.
  conditional: { id: string; when: Condition }[];
  bed?: Bed;
}

export interface Equipment {
  mmu: boolean;
  enclosure: boolean;
  chamber: boolean;
  tools: number;
}

export function met(c: Condition | undefined, e: Equipment): boolean {
  if (!c) return true;
  if (c === 'mmu') return e.mmu;
  if (c === 'enclosure') return e.enclosure;
  if (c === 'chamber') return e.chamber;
  return e.tools >= Number(c.slice('tools>='.length));
}

/// A label's own condition, else what its heater needs: tool n needs n
/// tools, the chamber a chamber.
export function labelCondition(label: Label): Condition | undefined {
  if (label.when) return label.when;
  if (label.heater === 'chamber') return 'chamber';
  const tool = /^T([2-8])$/.exec(label.heater)?.[1];
  return tool ? (`tools>=${tool}` as Condition) : undefined;
}

export interface Reading {
  current: number;
  target: number;
  /// The tool picked now, on a printer with several.
  active?: boolean;
}

/// Within this many degrees of the target, or without one, it is steady.
const TOLERANCE = 2;

/// Below this a heater with no target counts as cold, not cooling.
const COLD = 40;

export function trend(r: Reading): 'up' | 'down' | undefined {
  if (r.target > r.current + TOLERANCE) return 'up';
  if (r.current > (r.target > 0 ? r.target : COLD) + TOLERANCE) return 'down';
  return undefined;
}

/// The label's colour: heating or holding a target, cooling down, or off
/// and cold.
export function tone(r: Reading): 'heating' | 'cooling' | 'off' {
  if (trend(r) === 'down') return 'cooling';
  return r.target > 0 ? 'heating' : 'off';
}

/// A reading in the chosen unit, in whole degrees: `215℃`.
export function labelValue(celsius: number): string {
  return `${Math.round(inUnit(celsius)).toString()}${unitSign()}`;
}

interface Telemetry {
  temp_nozzle?: number | undefined;
  target_nozzle?: number | undefined;
  temp_bed?: number | undefined;
  target_bed?: number | undefined;
  tools?:
    | Record<
        string,
        {
          active?: boolean | undefined;
          nozzle_temp?: number | undefined;
          nozzle_target_temp?: number | null | undefined;
        } | null
      >
    | undefined;
  chamber?:
    | { temp?: number | undefined; target_temp?: number | null | undefined }
    | undefined;
}

/// What each label can show. The plain /api/v1/status reports the active
/// tool as T1 and no chamber; a tool changer with no tool picked has no
/// active tool to report. The expanded one (PrusaLink 2) has every tool,
/// 0-based, as T1..T8, and the chamber.
export function heaterReadings(
  status: Telemetry | undefined,
  {
    offline,
    toolPicked,
    perTool = true,
  }: {
    offline: boolean;
    toolPicked: boolean;
    /// A heater per tool (the XL). Without (the INDX), the one toolhead's
    /// reading is the picked tool's, on the first tool's label.
    perTool?: boolean;
  },
): Partial<Record<Heater, Reading>> {
  if (!status || offline) return {};
  const out: Partial<Record<Heater, Reading>> = {};
  const tools = Object.entries(status.tools ?? {}).filter(([k]) =>
    /^\d$/.test(k),
  );
  for (const [key, tool] of tools)
    if (tool?.nozzle_temp !== undefined)
      out[`T${String(perTool ? Number(key) + 1 : 1)}` as Heater] = {
        current: tool.nozzle_temp,
        target: tool.nozzle_target_temp ?? 0,
        ...(tools.length > 1 && tool.active && { active: true }),
      };
  if (status.chamber?.temp !== undefined)
    out.chamber = {
      current: status.chamber.temp,
      target: status.chamber.target_temp ?? 0,
    };
  if (!tools.length && toolPicked && status.temp_nozzle !== undefined)
    out.T1 = {
      current: status.temp_nozzle,
      target: status.target_nozzle ?? 0,
    };
  if (status.temp_bed !== undefined)
    out.bed = { current: status.temp_bed, target: status.target_bed ?? 0 };
  return out;
}

/// The labels to draw: those whose condition holds and whose heater has a
/// reading.
export function shownLabels(
  labels: readonly Label[],
  equipment: Equipment,
  readings: Partial<Record<Heater, Reading>>,
): Label[] {
  return labels.filter(
    (l) =>
      met(labelCondition(l), equipment) && readings[l.heater] !== undefined,
  );
}

/// The value sits centred above the horizontal line, the caption below it,
/// and a dot marks the anchor.
export function labelLayout(label: Label, style: LabelStyle) {
  return {
    textX: (label.elbow[0] + label.end[0]) / 2,
    valueY: label.elbow[1] - style.stroke * 1.5 - style.value * 0.12,
    captionY: label.elbow[1] + style.stroke * 1.5 + style.caption * 0.85,
    dot: style.stroke * 2.2,
  };
}

/// Marks the elements with `ids` display="none" in the build's SVG markup,
/// which quotes attributes with single quotes.
export function hideIds(svg: string, ids: readonly string[]): string {
  if (!ids.length) return svg;
  const set = new Set(ids);
  return svg.replace(/\bid='([^']+)'/g, (attr, id: string) =>
    set.has(id) ? `${attr} display='none'` : attr,
  );
}
