import { describe, expect, it } from 'vitest';

import { regionUnit } from './units.svelte';

describe('regionUnit', () => {
  it.each([
    [['en-US'], 'America/New_York', 'F'],
    [['en-US'], 'Pacific/Honolulu', 'F'],
    [['en-US'], 'Europe/Prague', 'C'],
    [['en-GB', 'en-US'], 'America/New_York', 'C'],
    [['cs-CZ'], 'America/New_York', 'C'],
    [['en'], 'America/Chicago', 'C'],
    [[], 'America/Chicago', 'C'],
  ] as const)('%j in %s → °%s', (languages, zone, unit) => {
    expect(regionUnit(languages, zone)).toBe(unit);
  });
});
