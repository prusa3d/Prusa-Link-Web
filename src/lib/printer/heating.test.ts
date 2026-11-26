import { describe, expect, it } from 'vitest';

import { heaterState } from './heating';

describe('heaterState', () => {
  it.each([
    [undefined, 0, 'not-reported'],
    [23, 0, 'off'],
    [120, 0, 'cooling'],
    [100, 215, 'heating'],
    [214, 215, 'at-temperature'],
    [230, 215, 'cooling'],
  ] as const)('%s → %s °C is %s', (current, target, state) => {
    expect(heaterState(current, target)).toBe(state);
  });
});
