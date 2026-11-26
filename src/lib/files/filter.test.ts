import { describe, expect, it } from 'vitest';

import { collectDropped, collectFiles } from './collect';
import { isHidden, isHiddenPath, isPrintable, pickerAccept } from './filter';

const file = (name: string, relative = '') =>
  Object.assign(new File(['G1 X0'], name), { webkitRelativePath: relative });

describe('file filter', () => {
  it.each([
    '.DS_Store',
    '._benchy.bgcode',
    '.Trashes',
    'System Volume Information',
    '__MACOSX',
  ])('hides %s', (name) => {
    expect(isHidden(name)).toBe(true);
  });

  it('hides a file inside a hidden folder', () => {
    expect(isHiddenPath('.git/part.gcode')).toBe(true);
    expect(isHiddenPath('parts/part.gcode')).toBe(false);
  });

  it('takes G-code by extension, in any case, and nothing else', () => {
    expect(isPrintable('Benchy.GCODE')).toBe(true);
    expect(isPrintable('benchy.bgcode')).toBe(true);
    expect(isPrintable('benchy.3mf')).toBe(false);
    expect(isPrintable('._benchy.bgcode')).toBe(false);
  });

  it('gives mobile pickers no type filter', () => {
    expect(pickerAccept(true)).toBe('.gcode,.bgcode');
    expect(pickerAccept(false)).toBeUndefined();
  });
});

describe('collecting picked and dropped files', () => {
  it('keeps G-code from a picker list and counts the rest', () => {
    const picked = collectFiles([
      file('a.gcode'),
      file('photo.jpg'),
      file('._a.gcode'),
    ]);
    expect(picked.files.map((f) => f.path)).toEqual(['a.gcode']);
    expect(picked.skipped).toBe(2);
  });

  it('sets firmware aside for the update dialog', () => {
    const picked = collectFiles([
      file('a.gcode'),
      file('XL_XL+_firmware_8.0.2.bbf'),
    ]);
    expect(picked.files.map((f) => f.path)).toEqual(['a.gcode']);
    expect(picked.firmware.map((f) => f.name)).toEqual([
      'XL_XL+_firmware_8.0.2.bbf',
    ]);
    expect(picked.skipped).toBe(0);
  });

  it('walks dropped folders and skips hidden ones', async () => {
    const entryFile = (fullPath: string) => ({
      isFile: true,
      isDirectory: false,
      name: fullPath.split('/').pop() ?? '',
      fullPath,
      file: (ok: (f: File) => void) => {
        ok(file(fullPath.split('/').pop() ?? ''));
      },
    });
    type FakeEntry = Record<string, unknown>;
    const folder = (fullPath: string, children: FakeEntry[]): FakeEntry => {
      let served = false;
      return {
        isFile: false,
        isDirectory: true,
        name: fullPath.split('/').pop() ?? '',
        fullPath,
        createReader: () => ({
          readEntries: (ok: (e: FakeEntry[]) => void) => {
            ok(served ? [] : children);
            served = true;
          },
        }),
      };
    };
    const dropped = folder('/project', [
      entryFile('/project/body.bgcode'),
      entryFile('/project/notes.txt'),
      entryFile('/project/.DS_Store'),
      folder('/project/.git', [entryFile('/project/.git/old.gcode')]),
      folder('/project/parts', [entryFile('/project/parts/lid.gcode')]),
    ]);
    const picked = await collectDropped([{ webkitGetAsEntry: () => dropped }]);
    expect(picked.files.map((f) => f.path)).toEqual([
      'project/body.bgcode',
      'project/parts/lid.gcode',
    ]);
    expect(picked.skipped).toBe(2);
  });
});

describe('ZIP archives', () => {
  it('uploads the G-code inside a ZIP and skips the rest', async () => {
    const { zipSync, strToU8 } = await import('fflate');
    const zip = zipSync({
      'project/body.bgcode': strToU8('GCDE'),
      'project/parts/lid.gcode': strToU8('G28'),
      'project/readme.txt': strToU8('hi'),
      '__MACOSX/project/._body.bgcode': strToU8('x'),
    });
    const { expandZips } = await import('./collect');
    const picked = collectFiles([
      new File([new Uint8Array(zip)], 'project.zip'),
    ]);
    expect(picked.zips).toHaveLength(1);
    const expanded = await expandZips(picked);
    expect(expanded.files.map((f) => f.path).sort()).toEqual([
      'project.zip/project/body.bgcode',
      'project.zip/project/parts/lid.gcode',
    ]);
    expect(expanded.skipped).toBe(2);
  });
});
