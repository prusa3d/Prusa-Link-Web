import { afterEach, describe, expect, it } from 'vitest';

import { setTemperatureUnit } from '../units.svelte';
import {
  type Equipment,
  heaterReadings,
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
    expect(labelValue(214.6)).toBe('215℃');
    expect(labelValue(22.4)).toBe('22℃');
    setTemperatureUnit('F');
    expect(labelValue(215)).toBe('419℉');
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
    ).toEqual({ T1: { current: 210, target: 215, active: true } });
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
      shownLabels(labels, { ...plain, tools: 2, chamber: true }, all).map(
        (l) => l.heater,
      ),
    ).toEqual(['T1', 'T2', 'bed', 'chamber']);
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
