import { describe, expect, it } from 'vitest';

import { bedHeat, bedStyle, bedTop } from './bed-heat';

describe('bedHeat', () => {
  it.each([
    [20, 60, 0],
    [25, 60, 0],
    [42.5, 60, 0.5],
    [60, 60, 1],
    [90, 60, 1],
    [67.5, 110, 0.5],
  ])('%s ℃ towards a top of %s ℃: %s', (current, top, expected) => {
    expect(bedHeat(current, top)).toBeCloseTo(expected);
  });

  it('stays in range for a top at or below room temperature', () => {
    expect(bedHeat(30, 20)).toBe(1);
    expect(bedHeat(20, 20)).toBe(0);
  });
});

describe('bedTop', () => {
  // One sequence: the last target seen is kept for the session.
  it('is the target, else the last one seen, else 110 ℃', () => {
    expect(bedTop(0)).toBe(110);
    expect(bedTop(null)).toBe(110);
    expect(bedTop(60)).toBe(60);
    expect(bedTop(0)).toBe(60);
    expect(bedTop(undefined)).toBe(60);
    expect(bedTop(90)).toBe(90);
  });
});

describe('bedStyle', () => {
  it('mixes the brand orange into dark grey by the heat, glowing as hot', () => {
    expect(bedStyle(0)).toBe(
      'fill:color-mix(in oklab,var(--color-orange-light-9) 0%,#3a3a3c);filter:drop-shadow(0 0 0px var(--color-orange-light-9))',
    );
    expect(bedStyle(0.426)).toContain(' 43%,');
    expect(bedStyle(1)).toContain(' 100%,');
    expect(bedStyle(1)).toContain('drop-shadow(0 0 6px ');
  });
});
