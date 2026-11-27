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
  present: [1],
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
    expect(labelCondition('T4', undefined)).toBe('T4');
    expect(labelCondition('chamber', undefined)).toBe('chamber');
    expect(labelCondition('chamber', 'enclosure')).toBe('enclosure');
  });

  it('parse only known values', () => {
    expect(parseCondition('tools>=8')).toBe('tools>=8');
    expect(parseCondition('tools>=9')).toBeUndefined();
    expect(parseCondition('tools=2|!enclosure&tools<=3')).toBe(
      'tools=2|!enclosure&tools<=3',
    );
    expect(parseCondition('tools=2|')).toBeUndefined();
    expect(parseCondition('door')).toBeUndefined();
    expect(conditionName('tools>=2')).toBe('2+ tools');
    expect(conditionName('!enclosure&tools<=3|tools=1')).toBe(
      'no enclosure and ≤3 tools or 1 tool',
    );
    expect(conditionName(undefined)).toBe('always');
  });

  it('join with & and |, and negate with !', () => {
    const xl = (tools: number, enclosure: boolean) => ({
      ...BARE,
      tools,
      enclosure,
    });
    const c = '!enclosure&tools<=3|tools=5';
    expect(met(c, xl(1, false))).toBe(true);
    expect(met(c, xl(3, true))).toBe(false);
    expect(met(c, xl(4, false))).toBe(false);
    expect(met(c, xl(5, true))).toBe(true);
    expect(met('tools=2', xl(2, true))).toBe(true);
    expect(met('!mmu', BARE)).toBe(true);
    const gap = { ...BARE, tools: 4, present: [1, 2, 4, 5] };
    expect(met('T4&!T3', gap)).toBe(true);
    expect(met('T3', gap)).toBe(false);
    expect(parseCondition('T3|!T9')).toBeUndefined();
    expect(conditionName('T2&!T3')).toBe('T2 and no T3');
  });

  it('hide elements by id in SVG text', () => {
    expect(hideIds('<g id="mmu"/><g id="mmu-2"/>', ['mmu'])).toBe(
      '<g id="mmu" display="none"/><g id="mmu-2"/>',
    );
  });
});
