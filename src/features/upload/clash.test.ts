import { describe, expect, it } from 'vitest';

import { freeName, settleClashes } from './clash';

const picked = (...names: string[]) =>
  names.map((n) => ({ path: n, file: new File(['x'], n) }));
const names = (list: { file: File }[]) => list.map((p) => p.file.name);

describe('freeName', () => {
  it('numbers the name before the extension', () => {
    expect(freeName('benchy.bgcode', new Set(['benchy.bgcode']))).toBe(
      'benchy-2.bgcode',
    );
    expect(
      freeName(
        'benchy.bgcode',
        new Set(['benchy.bgcode', 'benchy-2.bgcode', 'benchy-3.bgcode']),
      ),
    ).toBe('benchy-4.bgcode');
  });
});

describe('settleClashes', () => {
  const batch = picked('a.gcode', 'b.gcode');
  const existing = ['a.gcode', 'a-2.gcode'];

  it('skips the clashing files', () => {
    expect(names(settleClashes(batch, existing, 'skip'))).toEqual(['b.gcode']);
  });

  it('keeps both under a free name', () => {
    expect(names(settleClashes(batch, existing, 'keep'))).toEqual([
      'a-3.gcode',
      'b.gcode',
    ]);
  });

  it('replaces as they are', () => {
    expect(names(settleClashes(batch, existing, 'replace'))).toEqual([
      'a.gcode',
      'b.gcode',
    ]);
  });
});
