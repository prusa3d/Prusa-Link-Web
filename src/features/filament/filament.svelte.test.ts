import { describe, expect, it } from 'vitest';

import { helperGcode } from './filament.svelte';

describe('helperGcode', () => {
  it('uses the firmware filament commands', () => {
    expect(helperGcode('load', 'PETG')).toContain('M701 S"PETG"');
    expect(helperGcode('unload')).toContain('M702');
    expect(helperGcode('load', 'PLA')).toContain('M862.6 P "Input Shaper"');
    expect(helperGcode('change', 'ASA').split('\n').slice(2, 4)).toEqual([
      'M702',
      'M701 S"ASA"',
    ]);
  });

  it('declares only the features each printer checks', () => {
    const marks = (v: Parameters<typeof helperGcode>[2]) =>
      helperGcode('load', 'PLA', v)
        .split('\n')
        .filter((l) => l.startsWith('M862.6'));
    expect(marks('mk4')).toEqual(['M862.6 P "Input Shaper"']);
    expect(marks('ix')).toEqual([]);
    expect(marks('coreone_indx')).toEqual([
      'M862.6 P "Input Shaper"',
      'M862.6 P "INDX lock"',
    ]);
    expect(marks(undefined)).toEqual(['M862.6 P "Input Shaper"']);
  });
});
