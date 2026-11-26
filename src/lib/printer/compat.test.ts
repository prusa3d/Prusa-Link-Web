import { describe, expect, it } from 'vitest';

import { fitsPrinter, slicedGroup } from './compat';

describe('fitsPrinter', () => {
  it('reads slicers’ printer models by group', () => {
    expect(slicedGroup('COREONE_INDX4T')).toBe('coreone_indx');
    expect(slicedGroup('MK4SMMU3')).toBe('mk4s');
    expect(slicedGroup('XL5IS')).toBe('xl');
    expect(slicedGroup('ENDER3')).toBeUndefined();
  });

  it('fits the same printer and an older one’s files, not another', () => {
    expect(fitsPrinter('MK4S', '1.4.1')).toBe(true);
    expect(fitsPrinter('MK4', '1.4.1')).toBe(true);
    expect(fitsPrinter('MK4S', '7.1.0')).toBe(true);
    expect(fitsPrinter('COREONE_INDX4T', '1.4.1')).toBe(false);
    expect(fitsPrinter('XL5IS', '7.10.0')).toBe(false);
    expect(fitsPrinter(undefined, '1.4.1')).toBeUndefined();
  });
});
