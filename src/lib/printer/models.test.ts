import { describe, expect, it } from 'vitest';

import { modelOf, printerTitle } from './models';

describe('printer models', () => {
  it('maps the firmware code to a model and its build', () => {
    expect(modelOf('3.1.0')).toEqual({
      name: 'Original Prusa XL',
      variant: 'xl',
    });
    expect(modelOf('1.4.1')?.variant).toBe('mk4');
    expect(modelOf('7.10.0')?.variant).toBe('coreone_indx');
    expect(modelOf('9.9.9')).toBeUndefined();
  });

  it('titles the printer by hostname and model', () => {
    expect(printerTitle('prusa-xl', modelOf('3.1.0'))).toBe(
      'prusa-xl · Original Prusa XL',
    );
    expect(printerTitle(undefined, modelOf('3.1.0'))).toBe('Original Prusa XL');
    expect(printerTitle('lab', undefined)).toBe('lab');
  });
});
