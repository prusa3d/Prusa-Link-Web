/// Celsius or Fahrenheit. On a first visit the browser picks it: Fahrenheit
/// where people use it (the United States and a few others), judged by the
/// language's region and the clock's time zone together; the header toggle
/// changes it and localStorage keeps the choice.

export type TemperatureUnit = 'C' | 'F';

export const UNIT_KEY = 'prusalink.temperature';

/// Regions that measure temperature in Fahrenheit.
const FAHRENHEIT = new Set(['US', 'LR', 'BS', 'BZ', 'KY', 'PW', 'FM', 'MH']);

/// Browsers default to "en-US" in many countries, so the language alone says
/// little: a US English browser in Prague still means Celsius. Fahrenheit
/// also needs a time zone where those regions are.
const FAHRENHEIT_ZONE = /^(America|Pacific|Africa\/Monrovia|US)\b/;

export function regionUnit(
  languages: readonly string[],
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): TemperatureUnit {
  const region = languages
    .map((tag) => /-([A-Z]{2})\b/i.exec(tag)?.[1]?.toUpperCase())
    .find(Boolean);
  return region && FAHRENHEIT.has(region) && FAHRENHEIT_ZONE.test(timeZone)
    ? 'F'
    : 'C';
}

function stored(): TemperatureUnit | undefined {
  try {
    const value = globalThis.localStorage.getItem(UNIT_KEY);
    return value === 'C' || value === 'F' ? value : undefined;
  } catch {
    return undefined;
  }
}

let unit = $state<TemperatureUnit>(
  stored() ?? regionUnit(globalThis.navigator.languages),
);

export function temperatureUnit(): TemperatureUnit {
  return unit;
}

export function setTemperatureUnit(next: TemperatureUnit) {
  unit = next;
  try {
    globalThis.localStorage.setItem(UNIT_KEY, next);
  } catch {
    // Applied for this visit only.
  }
}

/// A Celsius reading in the chosen unit, as a number.
export function inUnit(celsius: number): number {
  return unit === 'F' ? (celsius * 9) / 5 + 32 : celsius;
}

/// The unit's own sign: one character, ℃ or ℉.
export function unitSign(of: TemperatureUnit = unit): string {
  return of === 'C' ? '℃' : '℉';
}

/// A Celsius reading in the chosen unit: `23℃`, `73℉`.
export function degrees(celsius: number): string {
  return `${inUnit(celsius).toFixed(0)}${unitSign()}`;
}
