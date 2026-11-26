import { describe, expect, it } from 'vitest';

import { listPictures, pictureLabel } from './printers.ts';

const MODELS = ['coreone', 'coreone_indx', 'mk4s', 'xl'];

describe('listPictures', () => {
  it('puts each variant under its model', () => {
    const list = listPictures(
      ['xl', 'mk4s_mmu3', 'coreone_indx', 'coreone_mmu3', 'mk4s', 'coreone'],
      MODELS,
    );
    expect(list.map((p) => p.name)).toEqual([
      'coreone',
      'coreone_mmu3',
      'coreone_indx',
      'mk4s',
      'mk4s_mmu3',
      'xl',
    ]);
    expect(list[1]).toEqual({
      name: 'coreone_mmu3',
      base: 'coreone',
      suffix: 'mmu3',
    });
    expect(list[2]?.base).toBeUndefined();
    expect(pictureLabel(list[1] ?? { name: '' })).toBe('↳ coreone + MMU3');
  });

  it('prefers the longest model name', () => {
    expect(
      listPictures(['coreone_indx', 'coreone_indx_mmu3'], MODELS)[1]?.base,
    ).toBe('coreone_indx');
  });
});
