import { describe, expect, it } from 'vitest';

import { heaterGlyph, trend } from './glyphs.ts';

describe('trend', () => {
  it('points the way the heater is going', () => {
    expect(trend({ current: 30, target: 215 })).toBe('up');
    expect(trend({ current: 200, target: 40 })).toBe('down');
  });

  it('is steady near the target or without one', () => {
    expect(trend({ current: 213, target: 215 })).toBeNull();
    expect(trend({ current: 217, target: 215 })).toBeNull();
    expect(trend({ current: 60, target: null })).toBeNull();
  });
});

describe('heaterGlyph', () => {
  it('uses the nozzle for every tool', () => {
    expect(heaterGlyph('T3')).toBe(heaterGlyph('T1'));
    expect(heaterGlyph('bed')).not.toBe(heaterGlyph('T1'));
    expect(heaterGlyph('chamber')).not.toBe(heaterGlyph('bed'));
  });
});
