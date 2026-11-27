import { afterEach, describe, expect, it } from 'vitest';

import { setTemperatureUnit } from '../units.svelte';
import {
  type Equipment,
  activeToolOf,
  fanTurn,
  heaterReadings,
  labelShadow,
  met,
  hideIds,
  type Label,
  labelValue,
  shownLabels,
  tone,
  trend,
} from './status-picture';

const at = (heater: Label['heater'], when?: Label['when']): Label => ({
  heater,
  anchor: [0, 0],
  elbow: [10, 10],
  end: [100, 10],
  ...(when && { when }),
});

const plain: Equipment = {
  mmu: false,
  enclosure: false,
  chamber: false,
  tools: 1,
  present: [1],
};

describe('trend', () => {
  it.each([
    [25, 215, 'up'],
    [212, 215, 'up'],
    [213, 215, undefined],
    [217, 215, undefined],
    [218, 215, 'down'],
    [120, 0, 'down'],
    [25, 0, undefined],
    [20, 0, undefined],
  ] as const)('%s °C towards %s °C: %s', (current, target, expected) => {
    expect(trend({ current, target })).toBe(expected);
  });
});

describe('labelValue', () => {
  afterEach(() => {
    setTemperatureUnit('C');
  });

  it('is whole degrees in the chosen unit', () => {
    setTemperatureUnit('C');
    expect(labelValue(214.6)).toBe('215°C');
    expect(labelValue(22.4)).toBe('22°C');
    setTemperatureUnit('F');
    expect(labelValue(215)).toBe('419°F');
  });
});

describe('heaterReadings', () => {
  const status = {
    temp_nozzle: 170.4,
    target_nozzle: 215,
    temp_bed: 59,
    target_bed: 60,
  };

  it('labels the active tool as T1 and the bed', () => {
    expect(
      heaterReadings(status, { offline: false, toolPicked: true }),
    ).toEqual({
      T1: { current: 170.4, target: 215 },
      bed: { current: 59, target: 60 },
    });
  });

  it('reports no tool when none is picked', () => {
    expect(
      heaterReadings(status, { offline: false, toolPicked: false }),
    ).toEqual({ bed: { current: 59, target: 60 } });
  });

  it('has nothing to show offline or before the first answer', () => {
    expect(heaterReadings(status, { offline: true, toolPicked: true })).toEqual(
      {},
    );
    expect(
      heaterReadings(undefined, { offline: false, toolPicked: true }),
    ).toEqual({});
  });

  it('takes a missing target as none', () => {
    expect(
      heaterReadings({ temp_bed: 30 }, { offline: false, toolPicked: true }),
    ).toEqual({ bed: { current: 30, target: 0 } });
  });

  it('labels every tool and the chamber from the expanded status', () => {
    expect(
      heaterReadings(
        {
          ...status,
          tools: {
            '0': { active: false, nozzle_temp: 24, nozzle_target_temp: null },
            '1': { active: true, nozzle_temp: 214, nozzle_target_temp: 215 },
          },
          chamber: { temp: 38, target_temp: 40 },
        },
        { offline: false, toolPicked: false },
      ),
    ).toEqual({
      T1: { current: 24, target: 0 },
      T2: { current: 214, target: 215, active: true },
      bed: { current: 59, target: 60 },
      chamber: { current: 38, target: 40 },
    });
  });
});

describe('heaterReadings without a heater per tool', () => {
  it('puts the picked tool’s reading on the first tool’s label', () => {
    expect(
      heaterReadings(
        {
          tools: {
            '0': { active: false },
            '2': { active: true, nozzle_temp: 210, nozzle_target_temp: 215 },
          },
        },
        { offline: false, toolPicked: true, perTool: false },
      ),
    ).toEqual({ T1: { current: 210, target: 215, active: true, picked: 3 } });
  });

  it('names the MMU slot the one nozzle prints from', () => {
    expect(
      heaterReadings(
        {
          tools: {
            '0': { nozzle_temp: 200, nozzle_target_temp: 210 },
            '0.0': { active: false },
            '0.3': { active: true },
          },
        },
        { offline: false, toolPicked: true, perTool: false },
      ),
    ).toEqual({ T1: { current: 200, target: 210, picked: 4 } });
  });
});

describe('shownLabels', () => {
  const reading = { current: 20, target: 0 };
  const all = {
    T1: reading,
    T2: reading,
    bed: reading,
    chamber: reading,
  };

  it('draws only heaters with a reading', () => {
    expect(
      shownLabels([at('T1'), at('bed')], plain, { bed: reading }).map(
        (l) => l.heater,
      ),
    ).toEqual(['bed']);
  });

  it('needs the tools and the chamber a heater implies', () => {
    const labels = [at('T1'), at('T2'), at('bed'), at('chamber')];
    expect(shownLabels(labels, plain, all).map((l) => l.heater)).toEqual([
      'T1',
      'bed',
    ]);
    expect(
      shownLabels(
        labels,
        { ...plain, tools: 2, present: [1, 2], chamber: true },
        all,
      ).map((l) => l.heater),
    ).toEqual(['T1', 'T2', 'bed', 'chamber']);
  });

  it("hides a tool's label while its dock is empty", () => {
    const labels = [at('T2'), at('T3'), at('T4')];
    const xl = { ...plain, tools: 3, present: [1, 2, 4] };
    const readings = { T2: reading, T3: reading, T4: reading };
    expect(shownLabels(labels, xl, readings).map((l) => l.heater)).toEqual([
      'T2',
      'T4',
    ]);
  });

  it("follows a label's own condition", () => {
    const labels = [at('T1', 'mmu')];
    expect(shownLabels(labels, plain, all)).toEqual([]);
    expect(shownLabels(labels, { ...plain, mmu: true }, all)).toEqual(labels);
  });
});

describe('hideIds', () => {
  it('hides the named parts of the markup', () => {
    expect(
      hideIds("<g id='door'/><g id='mmu-a'/><path id='door2'/>", ['door']),
    ).toBe("<g id='door' display='none'/><g id='mmu-a'/><path id='door2'/>");
  });
});

describe('tone', () => {
  it.each([
    [{ current: 120, target: 215 }, 'heating'],
    [{ current: 214, target: 215 }, 'heating'],
    [{ current: 230, target: 215 }, 'cooling'],
    [{ current: 150, target: 0 }, 'cooling'],
    [{ current: 25, target: 0 }, 'off'],
  ] as const)('%o: %s', (reading, expected) => {
    expect(tone(reading)).toBe(expected);
  });
});

describe('fanTurn', () => {
  const on = { offline: false, toolPicked: true, mini: false };
  const hotend = { kind: 'hotend' as const };

  it('turns as fast as the fan reports, and stands at 0 RPM', () => {
    expect(fanTurn(hotend, { fan_hotend: 5000 }, on)).toBe(1);
    expect(fanTurn(hotend, { fan_hotend: 10000 }, on)).toBe(0.5);
    expect(fanTurn(hotend, { fan_hotend: 0, temp_nozzle: 200 }, on)).toBe(
      undefined,
    );
    expect(fanTurn({ kind: 'print' }, { fan_print: 2500 }, on)).toBe(2);
  });

  it('without a reading, runs the hotend fan above the auto-fan temperature', () => {
    expect(fanTurn(hotend, { temp_nozzle: 51 }, on)).toBe(1);
    expect(fanTurn(hotend, { temp_nozzle: 50 }, on)).toBe(undefined);
    expect(fanTurn(hotend, { temp_nozzle: 46 }, { ...on, mini: true })).toBe(1);
    expect(fanTurn({ kind: 'print' }, { temp_nozzle: 200 }, on)).toBe(
      undefined,
    );
  });

  it("stands offline, with no tool picked, or for another tool's fan", () => {
    const s = { fan_hotend: 5000 };
    expect(fanTurn(hotend, s, { ...on, offline: true })).toBe(undefined);
    expect(fanTurn(hotend, s, { ...on, toolPicked: false })).toBe(undefined);
    expect(fanTurn({ ...hotend, tool: 2 }, s, on)).toBe(undefined);
    expect(fanTurn({ ...hotend, tool: 1 }, s, on)).toBe(1);
  });
});

describe('labelShadow', () => {
  it('is off unless the picture asks for it, and scales with the lines', () => {
    expect(labelShadow({ value: 30, caption: 15, stroke: 2 })).toBeUndefined();
    expect(
      labelShadow({ value: 30, caption: 15, stroke: 2, shadow: true }),
    ).toBe('drop-shadow(0 0.5px 1px #0007)');
  });
});

describe('met', () => {
  const xl = (
    tools: number,
    enclosure: boolean,
    present = Array.from({ length: tools }, (_, i) => i + 1),
  ): Equipment => ({
    mmu: false,
    enclosure,
    chamber: false,
    tools,
    present,
  });

  it('holds for a tool that is there, whatever the count', () => {
    const gap = xl(4, false, [1, 2, 4, 5]);
    expect(met('T4', gap)).toBe(true);
    expect(met('T3', gap)).toBe(false);
    expect(met('T5&!T3', gap)).toBe(true);
    expect(met('tools=4', gap)).toBe(true);
  });

  it('holds for single conditions as before', () => {
    expect(met(undefined, xl(1, false))).toBe(true);
    expect(met('tools>=2', xl(1, false))).toBe(false);
    expect(met('enclosure', xl(1, true))).toBe(true);
  });

  it('joins with &, separates with | and negates with !', () => {
    const c = 'enclosure&tools>=4|!enclosure&tools<=2|tools=3';
    expect(met(c, xl(5, true))).toBe(true);
    expect(met(c, xl(5, false))).toBe(false);
    expect(met(c, xl(2, false))).toBe(true);
    expect(met(c, xl(2, true))).toBe(false);
    expect(met(c, xl(3, true))).toBe(true);
    expect(met('!mmu', xl(1, false))).toBe(true);
  });
});

describe('activeToolOf', () => {
  it('is the tool the status marks active, from 1, MMU slots aside', () => {
    expect(
      activeToolOf({
        tools: { '0': { active: false }, '2': { active: true }, '0.1': null },
      }),
    ).toBe(3);
    expect(activeToolOf({ tools: { '0.0': { active: true } } })).toBe(
      undefined,
    );
    expect(activeToolOf({})).toBe(undefined);
  });
});
