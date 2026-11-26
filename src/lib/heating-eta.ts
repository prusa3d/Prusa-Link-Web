/// Seconds until a heater reaches its target, from recent readings: the
/// slope over the last `windowMs`, once at least `minMs` of rising readings
/// exist. Undefined while it is too early, not rising, or already there.
export interface Reading {
  at: number;
  temp: number;
}

export function heatingEta(
  readings: readonly Reading[],
  target: number,
  minMs = 5000,
  windowMs = 15_000,
): number | undefined {
  const last = readings.at(-1);
  if (!last || last.temp >= target) return undefined;
  const recent = readings.filter((r) => r.at >= last.at - windowMs);
  const first = recent[0];
  if (!first || last.at - first.at < minMs) return undefined;
  // Least squares, so one noisy reading does not swing the estimate.
  const n = recent.length;
  const mt = recent.reduce((s, r) => s + r.at, 0) / n;
  const mv = recent.reduce((s, r) => s + r.temp, 0) / n;
  const num = recent.reduce((s, r) => s + (r.at - mt) * (r.temp - mv), 0);
  const den = recent.reduce((s, r) => s + (r.at - mt) ** 2, 0);
  const perMs = den > 0 ? num / den : 0;
  if (perMs <= 0) return undefined;
  return Math.ceil((target - last.temp) / perMs / 1000);
}
