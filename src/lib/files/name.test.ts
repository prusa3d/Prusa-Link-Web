import { describe, expect, it } from 'vitest';

import { formatDuration, parseFileName } from './name';

// The PrusaOS cases (storage-manager tests/test_displayname.py), plus the
// fields PrusaLink shows.
describe.each(['.gcode', '.bgcode'])('parseFileName (%s)', (ext) => {
  it('reads the PrusaSlicer template', () => {
    expect(
      parseFileName(`phone-stand_0.4n_0.15mm_PLA_MK4S_1h36m${ext}`),
    ).toEqual({
      name: 'phone-stand',
      nozzle: '0.4',
      layer: '0.15mm',
      materials: ['PLA'],
      printer: 'MK4S',
      duration: 5760,
    });
  });

  it('reads several materials and any printer name', () => {
    const info = parseFileName(
      `project name_0.4n_0.2mm_PLA,PLA_NEXT_11h23m${ext}`,
    );
    expect(info.name).toBe('project name');
    expect(info.materials).toEqual(['PLA', 'PLA']);
    expect(info.printer).toBe('NEXT');
    expect(info.duration).toBe(11 * 3600 + 23 * 60);
  });

  it.each(['_v1', '[1]', ' some random string'])(
    'keeps the suffix %j in the name',
    (suffix) => {
      expect(
        parseFileName(
          `project name_0.4n_0.2mm_PLA,PLA_NEXT_11h23m${suffix}${ext}`,
        ).name,
      ).toBe(`project name${suffix}`);
    },
  );

  it('shows a name no template fits whole', () => {
    expect(parseFileName(`some random name${ext}`)).toEqual({
      name: 'some random name',
      materials: [],
    });
  });

  it('decodes %20', () => {
    expect(
      parseFileName(`project%20name_0.4n_0.2mm_PLA,PLA_NEXT_11h23m${ext}`).name,
    ).toBe('project name');
    expect(parseFileName(`some%20random%20name${ext}`).name).toBe(
      'some random name',
    );
  });
});

describe('parseFileName, older templates', () => {
  it('reads one without the nozzle', () => {
    const info = parseFileName('vase_0.2mm_PETG_MK3S_2d3h.gcode');
    expect(info).toMatchObject({
      name: 'vase',
      layer: '0.2mm',
      printer: 'MK3S',
    });
    expect(info.duration).toBe((2 * 24 + 3) * 3600);
  });

  it('reads one without the time', () => {
    expect(parseFileName('hook_0.2mm_ASA_MINI.gcode')).toMatchObject({
      name: 'hook',
      materials: ['ASA'],
      printer: 'MINI',
    });
  });

  it('reads the firmware short extension', () => {
    expect(parseFileName('cube_0.4n_0.2mm_PLA_MK4S_14m.bgc').name).toBe('cube');
  });
});

describe('formatDuration', () => {
  it.each([
    [5760, '1h 36m'],
    [840, '14m'],
    [3600, '1h'],
    [183_600, '2d 3h'],
    [20, '0m'],
  ])('%i s is %s', (s, text) => {
    expect(formatDuration(s)).toBe(text);
  });
});
