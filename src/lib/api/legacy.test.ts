import { describe, expect, it } from 'vitest';

import { materialMismatch } from './legacy';

describe('materialMismatch', () => {
  it('flags one material that is not the loaded one', () => {
    expect(materialMismatch(['PETG'], 'PLA')).toBe(true);
    expect(materialMismatch(['pla'], 'PLA')).toBe(false);
  });

  it('leaves unknown and multi-material cases to the printer', () => {
    expect(materialMismatch([], 'PLA')).toBe(false);
    expect(materialMismatch(['PETG'], undefined)).toBe(false);
    expect(materialMismatch(['PLA', 'PETG'], 'PLA')).toBe(false);
    expect(materialMismatch(['PLA', 'PLA'], 'PETG')).toBe(true);
  });
});
