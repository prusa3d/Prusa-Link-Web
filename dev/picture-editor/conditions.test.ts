import { describe, expect, it } from 'vitest';

import {
  conditionName,
  type Equipment,
  hideIds,
  labelCondition,
  met,
  parseCondition,
} from './conditions.ts';

const BARE: Equipment = {
  mmu: false,
  enclosure: false,
  chamber: false,
  tools: 1,
};

describe('conditions', () => {
  it('hold for the equipment that is there', () => {
    expect(met(undefined, BARE)).toBe(true);
    expect(met('mmu', BARE)).toBe(false);
    expect(met('mmu', { ...BARE, mmu: true })).toBe(true);
    expect(met('chamber', { ...BARE, chamber: true })).toBe(true);
    expect(met('tools>=3', { ...BARE, tools: 2 })).toBe(false);
    expect(met('tools>=3', { ...BARE, tools: 5 })).toBe(true);
  });

  it('follow from a label heater unless set', () => {
    expect(labelCondition('T1', undefined)).toBeUndefined();
    expect(labelCondition('bed', undefined)).toBeUndefined();
    expect(labelCondition('T4', undefined)).toBe('tools>=4');
    expect(labelCondition('chamber', undefined)).toBe('chamber');
    expect(labelCondition('chamber', 'enclosure')).toBe('enclosure');
  });

  it('parse only known values', () => {
    expect(parseCondition('tools>=8')).toBe('tools>=8');
    expect(parseCondition('tools>=9')).toBeUndefined();
    expect(conditionName('tools>=2')).toBe('2+ tools');
    expect(conditionName(undefined)).toBe('always');
  });

  it('hide elements by id in SVG text', () => {
    expect(hideIds('<g id="mmu"/><g id="mmu-2"/>', ['mmu'])).toBe(
      '<g id="mmu" display="none"/><g id="mmu-2"/>',
    );
  });
});
