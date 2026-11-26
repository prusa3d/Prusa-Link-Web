/// A heater's state from its reading, as Prusa Connect words it
/// (connect-ui domain/heating.ts): heating, at temperature, cooling, or off.

export type HeaterState =
  'heating' | 'at-temperature' | 'cooling' | 'off' | 'not-reported';

/// Within this many degrees of the target counts as there.
const TOLERANCE = 2;
/// A heater turned off still reads as cooling while above this.
const COOLING_FLOOR = 40;

export function heaterState(
  current: number | undefined,
  target: number | undefined,
): HeaterState {
  if (current === undefined) return 'not-reported';
  if (target === undefined || target <= 0)
    return current > COOLING_FLOOR ? 'cooling' : 'off';
  if (current < target - TOLERANCE) return 'heating';
  if (current > target + TOLERANCE) return 'cooling';
  return 'at-temperature';
}
