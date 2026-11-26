/// Celsius or Fahrenheit. The browser's region picks it on a first visit
/// (Fahrenheit where people use it: the United States and a few others);
/// the header toggle changes it and localStorage keeps the choice.

export type TemperatureUnit = 'C' | 'F';

export const UNIT_KEY = 'prusalink.temperature';

/// Regions that measure temperature in Fahrenheit.
const FAHRENHEIT = new Set(['US', 'LR', 'BS', 'BZ', 'KY', 'PW', 'FM', 'MH']);

export function regionUnit(languages: readonly string[]): TemperatureUnit {
  const region = languages
    .map((tag) => /-([A-Z]{2})\b/i.exec(tag)?.[1]?.toUpperCase())
    .find(Boolean);
  return region && FAHRENHEIT.has(region) ? 'F' : 'C';
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

/// A Celsius reading in the chosen unit: `23°C`, `73°F`.
export function degrees(celsius: number): string {
  return `${inUnit(celsius).toFixed(0)}°${unit}`;
}
