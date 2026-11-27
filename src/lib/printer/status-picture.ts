import { inUnit, temperatureUnit } from '../units.svelte';
import type { Shape } from './bed-heat';

/// The labels a status picture carries (assets/printers/status, saved by the
/// picture editor): one leader per heater, from the part it names to the
/// line its reading sits on. Coordinates are in the built picture's units.

export type Heater =
  'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'T8' | 'bed' | 'chamber';

/// When a part or a label shows: with an MMU, with an enclosure, when the
/// printer reports a chamber temperature, with at least, at most or exactly
/// N tools, with tool N (`T3`); `!` negates one, `&` joins them, `|`
/// separates alternatives (`!enclosure&tools<=3|T5`). The picture editor
/// checks the syntax.
export type Condition = string;

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
  shadow?: true;
}

/// A slight shadow under a label, sized by its line width so it reads the
/// same on any picture.
export function labelShadow(style: LabelStyle): string | undefined {
  const s = style.stroke;
  return (
    style.shadow && `drop-shadow(0 ${String(s / 4)}px ${String(s / 2)}px #0007)`
  );
}

export interface PictureStatus {
  style: LabelStyle;
  labels: Label[];
  /// Parts of the picture shown only under a condition, by element id.
  conditional: { id: string; when: Condition }[];
  bed?: Shape[];
  /// Drawn at a lower opacity, under the bed.
  chamber?: Shape[];
  /// Filled with the colour of the printer's state.
  status?: Shape[];
  fans?: Fan[];
  carriage?: Carriage;
}

/// A toolchanger's carriage, drawn in place of the picture's and slid in
/// front of the picked tool's dock.
export interface Carriage {
  shapes: Shape[];
  /// Its offset per picked tool, from 1, and with none picked ("0"); as
  /// drawn where one is missing.
  positions: Record<string, Point>;
}

/// A fan drawn in its own colours, in place of the picture's, turning around
/// `center` while it runs.
export interface Fan {
  kind: 'hotend' | 'print';
  /// The tool it cools on a multi-tool printer.
  tool?: number;
  center: Point;
  shapes: Shape[];
}

/// The fan's RPM at which the picture turns once a second: a real fan turns
/// far faster than a picture can show.
const RPM_PER_TURN = 5000;

/// Seconds per turn of the picture's fan, or none while it stands. The API
/// reports the active tool's fans only, the way it does its temperature.
/// Without a reading, the hotend fan runs above Marlin's
/// EXTRUDER_AUTO_FAN_TEMPERATURE (45 ℃ on the MINI, else 50 ℃).
export function fanTurn(
  fan: Pick<Fan, 'kind' | 'tool'>,
  status: Telemetry | undefined,
  {
    offline,
    toolPicked,
    mini,
  }: { offline: boolean; toolPicked: boolean; mini: boolean },
): number | undefined {
  if (!status || offline || !toolPicked || (fan.tool ?? 1) > 1)
    return undefined;
  let rpm = fan.kind === 'hotend' ? status.fan_hotend : status.fan_print;
  if (rpm === undefined && fan.kind === 'hotend')
    rpm = (status.temp_nozzle ?? 0) > (mini ? 45 : 50) ? RPM_PER_TURN : 0;
  return rpm ? RPM_PER_TURN / rpm : undefined;
}

export interface Equipment {
  mmu: boolean;
  enclosure: boolean;
  chamber: boolean;
  /// How many tools are enabled.
  tools: number;
  /// Which, from 1: an XL may leave docks empty (1, 2, 4 and 5).
  present: readonly number[];
}

export function met(c: Condition | undefined, e: Equipment): boolean {
  return (
    !c ||
    c.split('|').some((alt) =>
      alt.split('&').every((atom) => {
        const not = atom.startsWith('!');
        const [, op = '', n] = /tools(.?=)(\d+)/.exec(atom) ?? [];
        const tool = /T(\d)/.exec(atom)?.[1];
        const d = e.tools - Number(n);
        let has = op
          ? { '>=': d >= 0, '<=': d <= 0, '=': !d }[op]
          : e[atom.slice(not ? 1 : 0) as 'mmu' | 'enclosure' | 'chamber'];
        if (tool) has = e.present.includes(Number(tool));
        return has !== not;
      }),
    )
  );
}

/// A label's own condition, else what its heater needs: tool n needs tool
/// n, the chamber a chamber.
export function labelCondition(label: Label): Condition | undefined {
  if (label.when) return label.when;
  if (label.heater === 'chamber') return 'chamber';
  const tool = /^T([2-8])$/.exec(label.heater)?.[1];
  return tool ? `T${tool}` : undefined;
}

export interface Reading {
  current: number;
  target: number;
  /// The tool picked now, on a printer with several.
  active?: boolean;
  /// One heated nozzle for several tools or MMU slots (the INDX, an MMU):
  /// the tool or slot it prints with, 1-based.
  picked?: number;
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

/// A reading in the chosen unit, in whole degrees: `215°C`. The label draws
/// the unit smaller, at 70 %.
export function labelValue(celsius: number): string {
  return `${Math.round(inUnit(celsius)).toString()}°${temperatureUnit()}`;
}

interface Telemetry {
  fan_hotend?: number | undefined;
  fan_print?: number | undefined;
  temp_nozzle?: number | undefined;
  target_nozzle?: number | undefined;
  temp_bed?: number | undefined;
  target_bed?: number | undefined;
  /// PrusaLink 2's expanded status: every tool, the picked one `active`.
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

/// The picked tool, from 1, where the status lists the tools; MMU slots
/// (`"0.N"`) are not tools.
export function activeToolOf(
  status: Telemetry | undefined,
): number | undefined {
  const [key] =
    Object.entries(status?.tools ?? {}).find(
      ([k, t]) => /^\d+$/.test(k) && t?.active,
    ) ?? [];
  return key === undefined ? undefined : Number(key) + 1;
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
  const slot = Object.entries(status.tools ?? {}).find(
    ([k, t]) => k.includes('.') && t?.active,
  );
  for (const [key, tool] of tools)
    if (tool?.nozzle_temp !== undefined) {
      let picked: number | undefined;
      if (slot) picked = Number(slot[0].split('.')[1]) + 1;
      else if (!perTool && tools.length > 1) picked = Number(key) + 1;
      out[`T${String(perTool ? Number(key) + 1 : 1)}` as Heater] = {
        current: tool.nozzle_temp,
        target: tool.nozzle_target_temp ?? 0,
        ...(tools.length > 1 && tool.active && { active: true }),
        ...(picked !== undefined && { picked }),
      };
    }
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

/// The widest reading a label must fit: three digits and the unit's sign.
export const WIDEST_VALUE = '888°C';

/// The value's width, estimated: tabular digits are 0.6 em wide in the app's
/// font (Atlas Grotesk); the unit (`°C`), drawn at 70 % with its letters
/// drawn closer, 0.8 em of the value.
export function valueWidth(text: string, style: LabelStyle): number {
  return ((text.length - 2) * 0.6 + 0.8) * style.value;
}

/// The chevron's size and its gap before the value.
export function chevronWidth(style: LabelStyle): number {
  return style.value * 0.62;
}

/// The box the value takes with the widest reading and a chevron, centred
/// on the label's line as drawn without moving it inward (see fitCentre).
export function labelFootprint(label: Label, style: LabelStyle) {
  const l = labelLayout(label, style);
  const width = valueWidth(WIDEST_VALUE, style) + chevronWidth(style);
  const y = l.valueY - style.value * 0.75;
  return {
    x: l.textX - width / 2,
    y,
    width,
    height: l.captionY + style.caption * 0.25 - y,
  };
}

/// Whether a label's widest reading reaches out of `box`.
export function leavesPicture(
  label: Label,
  style: LabelStyle,
  box: { x: number; y: number; width: number; height: number },
): boolean {
  const f = labelFootprint(label, style);
  return (
    f.x < box.x ||
    f.y < box.y ||
    f.x + f.width > box.x + box.width ||
    f.y + f.height > box.y + box.height
  );
}

/// Where a text `width` wide centres: on `x`, moved inward as far as it
/// takes to stay within `[0, size]`.
export function fitCentre(x: number, width: number, size: number): number {
  return Math.min(Math.max(x, width / 2), size - width / 2);
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
