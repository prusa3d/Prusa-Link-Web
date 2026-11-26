import { describe, expect, it } from 'vitest';

import { groupMaterials } from './group-materials';

describe('groupMaterials', () => {
  it('counts repeats and keeps the order', () => {
    expect(groupMaterials(['PLA', 'PETG', 'PLA'])).toEqual(['PLA ×2', 'PETG']);
    expect(groupMaterials(['ASA'])).toEqual(['ASA']);
  });
});
