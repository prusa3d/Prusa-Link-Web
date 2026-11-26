import { describe, expect, it } from 'vitest';

import type { Status } from '../stores/printer.svelte';
import { toolRows } from './tools';

describe('toolRows', () => {
  it('joins the expanded status with the tools /info describes', () => {
    const status = {
      state: 'PRINTING',
      tools: {
        '1': { active: true, nozzle_temp: 214.8, nozzle_target_temp: 215 },
        '0': { active: false, nozzle_temp: 24, nozzle_target_temp: null },
        '0.1': { active: false },
      },
    } as unknown as Status;
    expect(
      toolRows(status, [{ material: 'PLA', color: '#ff8000' }, undefined]),
    ).toEqual([
      {
        index: 0,
        temp: 24,
        target: undefined,
        active: false,
        material: 'PLA',
        color: '#ff8000',
      },
      {
        index: 1,
        temp: 214.8,
        target: 215,
        active: true,
        material: undefined,
        color: undefined,
      },
    ]);
  });

  it('is empty without the expanded status', () => {
    expect(toolRows({ state: 'IDLE' }, [])).toEqual([]);
  });
});
