import { describe, expect, it } from 'vitest';

import { isNewer, parseVersion, updateFor, type Release } from './releases';

const release: Release = {
  version: 'v8.0.2',
  notes: 'https://github.com/prusa3d/Prusa-Firmware-Buddy/releases/tag/v8.0.2',
  assets: [
    { name: 'XL_XL+_firmware_8.0.2.bbf', url: 'u/xl' },
    { name: 'COREONE_COREONE+GEN2_firmware_8.0.2.bbf', url: 'u/c1' },
    { name: 'COREONE_COREONE+GEN2_INDX_firmware_8.0.2.bbf', url: 'u/indx' },
  ],
};

describe('firmware releases', () => {
  it('reads firmware versions', () => {
    expect(parseVersion('8.0.2+17092')).toEqual([8, 0, 2]);
    expect(parseVersion('v6.2.0-RC1')).toEqual([6, 2, 0]);
    expect(parseVersion('LOCAL')).toBeUndefined();
  });

  it('compares versions', () => {
    expect(isNewer('v8.0.2', '8.0.1+17000')).toBe(true);
    expect(isNewer('v8.0.2', '8.0.2+17092')).toBe(false);
    expect(isNewer('v8.0.2', '8.1.0')).toBe(false);
    expect(isNewer('v8.0.2', 'unknown')).toBe(false);
  });

  it('finds the file for the printer, not a sibling build', () => {
    expect(updateFor(release, '8.0.1', 'coreone')?.file?.url).toBe('u/c1');
    expect(updateFor(release, '8.0.1', 'coreone_indx')?.file?.url).toBe(
      'u/indx',
    );
    expect(updateFor(release, '8.0.1', 'mini')?.file).toBeUndefined();
    expect(updateFor(release, '8.0.2', 'xl')).toBeUndefined();
  });
});
