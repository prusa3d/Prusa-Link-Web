import { describe, expect, it } from 'vitest';

import { heatingEta } from './heating-eta';

const rising = (seconds: number, perSecond: number, from = 30) =>
  Array.from({ length: seconds + 1 }, (_, i) => ({
    at: i * 1000,
    temp: from + i * perSecond,
  }));

describe('heatingEta', () => {
  it('waits for five seconds of readings', () => {
    expect(heatingEta(rising(3, 2), 230)).toBeUndefined();
  });

  it('extrapolates the recent slope', () => {
    // 2 °C/s from 30 °C; after 10 s at 50 °C, 180 °C to go.
    expect(heatingEta(rising(10, 2), 230)).toBe(90);
  });

  it('gives nothing when not rising or already there', () => {
    expect(heatingEta(rising(10, 0), 230)).toBeUndefined();
    expect(heatingEta(rising(10, 2, 240), 230)).toBeUndefined();
  });
});
