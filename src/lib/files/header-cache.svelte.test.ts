import { describe, expect, it } from 'vitest';

import { fileKey, knownHeader, rememberHeader } from './header-cache';

describe('header cache', () => {
  it('keeps a header per file, also for a reload in the same tab', () => {
    rememberHeader(fileKey('plates', 'a.bgcode'), { filament_type: 'PLA' });
    expect(knownHeader('plates/a.bgcode')).toEqual({ filament_type: 'PLA' });
    expect(
      JSON.parse(
        sessionStorage.getItem('prusalink.header:plates/a.bgcode') ?? '',
      ),
    ).toEqual({ filament_type: 'PLA' });
    expect(knownHeader(fileKey('', 'b.bgcode'))).toBeUndefined();
  });
});
