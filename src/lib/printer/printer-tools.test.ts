import { describe, expect, it } from 'vitest';

import { mappingTargets } from '../stores/identity.svelte';
import { printerTools } from './printer-tools';

const head = (more: Record<string, unknown> = {}) => ({
  type: 'FFF_PRINT_HEAD',
  features: {
    nozzle_diameter: 0.6,
    nozzle_hardened: true,
    nozzle_high_flow: false,
  },
  ...more,
});
const pla = {
  material_package_instance: {
    class: 'FFF',
    package: { class: 'FFF', material: { class: 'FFF', abbreviation: 'PLA' } },
  },
};

describe('printerTools', () => {
  it('reads an MMU from its head’s feeder; slots take the head’s nozzle', () => {
    const tools = {
      '0': head({
        feeder: {
          type: 'MMU',
          model: 'MMU3',
          base_model: 'MMU3',
          slot_count: 5,
        },
      }),
      '0.0': { type: 'FFF_FEEDER_SLOT', ...pla },
      '0.1': { type: 'FFF_FEEDER_SLOT', material_package_instance: null },
      '0.2': null,
    };
    const tree = printerTools(tools);
    expect(tree.isMultiMaterial()).toBe(true);
    expect(tree.isMultitool()).toBe(false);
    expect(tree.mmu()?.slot_count).toBe(5);
    expect(mappingTargets({ tools })).toEqual([
      expect.objectContaining({
        id: '0.0',
        index: 1,
        material: 'PLA',
        nozzle: 0.6,
        hardened: true,
        disabled: false,
      }),
      expect.objectContaining({
        id: '0.1',
        index: 2,
        material: undefined,
        nozzle: 0.6,
      }),
      expect.objectContaining({
        id: '0.2',
        index: 3,
        nozzle: 0.6,
        disabled: true,
      }),
    ]);
  });

  it('maps a head with its MMU off (feeder null) and the XL’s heads', () => {
    expect(
      printerTools({ '0': head({ feeder: null }) }).isMultiMaterial(),
    ).toBe(false);
    const xl = { '0': head(pla), '1': null, '2': head() };
    expect(printerTools(xl).isMultitool()).toBe(true);
    expect(
      mappingTargets({ tools: xl }).map((t) => [t.index, t.disabled]),
    ).toEqual([
      [1, false],
      [2, true],
      [3, false],
    ]);
  });
});
