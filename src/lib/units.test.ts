import { describe, expect, it } from 'vitest';

import { regionUnit } from './units.svelte';

describe('regionUnit', () => {
  it.each([
    [['en-US'], 'F'],
    [['en-GB', 'en-US'], 'C'],
    [['cs-CZ'], 'C'],
    [['en'], 'C'],
    [[], 'C'],
  ] as const)('%j → °%s', (languages, unit) => {
    expect(regionUnit(languages)).toBe(unit);
  });
});
