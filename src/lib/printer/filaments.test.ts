import { describe, expect, it } from 'vitest';

import { filamentLabel, firmwareFilament, loadableFilament } from './filaments';

describe('filaments', () => {
  it('speaks TPU to people and FLEX to the firmware', () => {
    expect(firmwareFilament('tpu')).toBe('FLEX');
    expect(filamentLabel('FLEX')).toBe('TPU');
    expect(loadableFilament('TPU')).toBe('FLEX');
    expect(loadableFilament('PLA-CF')).toBeUndefined();
  });
});
