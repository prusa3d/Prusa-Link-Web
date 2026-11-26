import type { MockFile, MockTool, PrinterModel } from './printer.ts';

/// What a printer looks like when the demo opens: idle, cold, with a USB stick
/// of sliced files for that model. Names follow PrusaSlicer's default output
/// template, and the stick stores them under 8.3 short names as the firmware
/// does.

const HOUR = 3600;

interface SeedFile {
  model: string;
  layer: string;
  material: string;
  minutes: number;
  kb: number;
  hoursAgo: number;
  dir?: string;
}

/// The firmware's limits, for the UI to survive: a 167-character file name
/// and a path as deep as FAT's 103-character canonical path allows (seven
/// levels of 8.3 names).
const DEEP_DIR = [
  'projects',
  '2026',
  'customer orders',
  'Prusa Research a.s. spare parts and replacement components',
  'MK4S',
  'extruder',
  'final',
].join('/');
const LONG_NAME =
  'replacement extruder idler lever with reinforced bearing pocket and longer screw channel for high flow nozzles revision 7';

const EXTREMES: SeedFile[] = [
  {
    model: LONG_NAME,
    layer: '0.2mm',
    material: 'PETG',
    minutes: 58,
    kb: 1_210,
    hoursAgo: 300,
  },
  {
    model: 'idler lever',
    layer: '0.2mm',
    material: 'PETG',
    minutes: 58,
    kb: 1_210,
    hoursAgo: 310,
    dir: DEEP_DIR,
  },
];

/// A folder of 300 files, for search, paging and thumbnail loading.
const ARCHIVE: SeedFile[] = Array.from({ length: 300 }, (_, i) => ({
  model: `archive part ${String(i + 1).padStart(3, '0')}`,
  layer: '0.2mm',
  material: ['PLA', 'PETG', 'ASA'][i % 3] ?? 'PLA',
  minutes: 10 + (i % 90),
  kb: 400 + i,
  hoursAgo: 400 + i,
  dir: 'archive',
}));

const COMMON: SeedFile[] = [
  {
    model: '3DBenchy',
    layer: '0.2mm',
    material: 'PLA',
    minutes: 42,
    kb: 2_150,
    hoursAgo: 2,
  },
  {
    model: 'calibration cube',
    layer: '0.2mm',
    material: 'PLA',
    minutes: 14,
    kb: 610,
    hoursAgo: 5,
  },
  {
    model: 'cable clip x6',
    layer: '0.2mm',
    material: 'PETG',
    minutes: 23,
    kb: 940,
    hoursAgo: 26,
  },
  {
    model: 'phone stand',
    layer: '0.15mm',
    material: 'PLA',
    minutes: 96,
    kb: 4_820,
    hoursAgo: 49,
  },
  {
    model: 'gridfinity bin 2x3',
    layer: '0.2mm',
    material: 'PETG',
    minutes: 131,
    kb: 6_330,
    hoursAgo: 75,
    dir: 'organizers',
  },
  {
    model: 'articulated dragon',
    layer: '0.2mm',
    material: 'PLA',
    minutes: 307,
    kb: 14_900,
    hoursAgo: 170,
    dir: 'toys/dragons',
  },
];

const MULTI_MATERIAL: SeedFile[] = [
  {
    model: 'multicolor keychain',
    layer: '0.2mm',
    material: 'PLA',
    minutes: 58,
    kb: 3_400,
    hoursAgo: 3,
    dir: 'multicolor',
  },
  {
    model: 'gasket and housing',
    layer: '0.2mm',
    material: 'PETG',
    minutes: 144,
    kb: 7_200,
    hoursAgo: 30,
    dir: 'multicolor',
  },
];

const SLICER_NAME: Record<PrinterModel, string> = {
  MK4S: 'MK4S',
  XL: 'XL5IS',
  XL_2: 'XL2IS',
  XL_SINGLE: 'XLIS',
  COREONE: 'COREONE',
  COREONE_INDX: 'COREONEINDX',
};

const TOOL_MATERIALS: Record<PrinterModel, string[]> = {
  MK4S: ['PLA'],
  XL: ['PLA', 'PETG', 'PLA', 'ASA', 'TPU'],
  XL_2: ['PLA', 'PETG'],
  XL_SINGLE: ['PLA'],
  COREONE: ['PETG'],
  COREONE_INDX: ['PLA', 'PLA', 'PETG', 'PETG', 'ASA', 'TPU', 'PLA', 'PVA'],
};

const COLORS = ['#f58231', '#1f77b4', '#2ca02c', '#d62728', '#9467bd'];

export function seedTools(model: PrinterModel): MockTool[] {
  return TOOL_MATERIALS[model].map((material, i) => ({
    temp: ambient(i),
    target: 0,
    material,
    color: COLORS[i % COLORS.length],
  }));
}

/// The firmware's filament presets (src/common/filament_presets.cpp), as
/// GET /api/v1/filaments lists them.
export const FILAMENTS: {
  name: string;
  nozzle: number;
  preheat: number;
  bed: number;
  chamber?: number;
}[] = [
  { name: 'PLA', nozzle: 215, preheat: 170, bed: 60 },
  { name: 'PETG', nozzle: 230, preheat: 170, bed: 85 },
  { name: 'ASA', nozzle: 260, preheat: 170, bed: 105, chamber: 40 },
  { name: 'ABS', nozzle: 255, preheat: 170, bed: 100, chamber: 40 },
  { name: 'PC', nozzle: 275, preheat: 170, bed: 100, chamber: 45 },
  { name: 'FLEX', nozzle: 240, preheat: 170, bed: 50 },
  { name: 'HIPS', nozzle: 220, preheat: 170, bed: 100 },
  { name: 'PP', nozzle: 240, preheat: 170, bed: 100 },
  { name: 'PA', nozzle: 285, preheat: 170, bed: 100, chamber: 45 },
  { name: 'PVB', nozzle: 215, preheat: 170, bed: 75 },
];

const FIRMWARE_PREFIX: Record<PrinterModel, string> = {
  MK4S: 'MK4_MK4S_MK3.9_MK3.9S',
  XL: 'XL_XL+',
  XL_2: 'XL_XL+',
  XL_SINGLE: 'XL_XL+',
  COREONE: 'COREONE_COREONE+GEN2',
  COREONE_INDX: 'COREONE_COREONE+GEN2_INDX',
};

/// The printer's own firmware name prefix, for the mock's compatibility check.
export const firmwarePrefix = (model: PrinterModel) => FIRMWARE_PREFIX[model];

/// Firmware files in the USB root: a newer and an older release for this
/// printer and one for another printer.
export function seedFirmware(model: PrinterModel): string[] {
  const own = FIRMWARE_PREFIX[model];
  const other = model === 'MK4S' ? FIRMWARE_PREFIX.XL : FIRMWARE_PREFIX.MK4S;
  return [
    `${own}_firmware_8.0.2.bbf`,
    `${own}_firmware_6.4.0.bbf`,
    `${other}_firmware_8.0.2.bbf`,
  ];
}

/// A plate of three shapes sliced for the CORE One INDX: its printer
/// metadata carries their outlines (objects_info), for cancelling objects.
const SHAPES = {
  dir: '',
  display_name: 'three shapes_0.4n_0.15mm_PLA_COREONEINDX4T_43m.bgcode',
  name: 'THREES~1.BGC',
  fixture: 'three-shapes.bgcode',
  size: 1_046_686,
  print_time: 43 * 60,
};
/// The same plate sliced for four filaments, for tool mapping.
const FOUR_COLOURS = {
  dir: '',
  display_name: 'four colours_0.4n_0.15mm_PLA,PETG,ASA_COREONEINDX4T_43m.gcode',
  name: 'FOURCO~1.GCO',
  fixture: 'four-colours.gcode',
  size: 3479,
  print_time: 43 * 60,
};
const SHAPES_TEXT = {
  dir: '',
  display_name: 'three shapes_0.4n_0.15mm_PLA_COREONEINDX4T_43m.gcode',
  name: 'THREES~1.GCO',
  fixture: 'three-shapes.gcode',
  size: 3479,
  print_time: 43 * 60,
};

/// Folders and files an operating system leaves on a stick. The app must not
/// show them.
const OS_FOLDERS = [
  '.Trashes',
  '.Spotlight-V100',
  '.fseventsd',
  'System Volume Information',
];

export function seedFiles(
  model: PrinterModel,
  now = Date.now(),
): { files: MockFile[]; folders: string[] } {
  const multi = TOOL_MATERIALS[model].length > 1;
  const list = [
    ...(multi ? [...MULTI_MATERIAL, ...COMMON] : COMMON),
    ...EXTREMES,
    ...ARCHIVE,
  ];
  const taken = new Map<string, Set<string>>();
  const files: MockFile[] = list.map((f) => {
    const duration = `${f.minutes >= 60 ? `${String(Math.floor(f.minutes / 60))}h` : ''}${String(f.minutes % 60)}m`;
    const display_name = `${f.model}_0.4n_${f.layer}_${f.material}_${SLICER_NAME[model]}_${duration}.bgcode`;
    const dir = f.dir ?? '';
    const names = taken.get(dir) ?? new Set<string>();
    taken.set(dir, names);
    return {
      dir,
      name: shortName(display_name, names),
      display_name,
      size: f.kb * 1024,
      m_timestamp: Math.floor(now / 1000 - f.hoursAgo * HOUR),
      print_time: f.minutes * 60,
    };
  });
  // macOS writes an AppleDouble "._" twin next to every file it copies.
  const [newest] = files;
  if (newest) {
    files.push({
      ...newest,
      name: '_3DBEN~1.BGC',
      display_name: `._${newest.display_name}`,
      size: 4096,
      m_timestamp: newest.m_timestamp - 60,
    });
  }
  // Firmware 8.0.2 can list two files under one 8.3 name; the app must cope.
  const [, second] = files;
  if (second) {
    files.push({
      ...second,
      display_name: second.display_name.replace('_0.4n', '2_0.4n'),
      m_timestamp: second.m_timestamp - 3600,
    });
  }
  const stamp = Math.floor(now / 1000 - 8 * HOUR);
  files.push(
    { ...SHAPES, m_timestamp: stamp },
    { ...SHAPES_TEXT, m_timestamp: stamp - 60 },
    ...(multi ? [{ ...FOUR_COLOURS, m_timestamp: stamp - 120 }] : []),
  );
  files.sort((a, b) => b.m_timestamp - a.m_timestamp);
  return { files, folders: OS_FOLDERS };
}

/// A room-temperature reading that is not a flat 22.0.
export function ambient(seed: number): number {
  return Math.round((22.6 + ((seed * 7) % 10) / 10) * 10) / 10;
}

/// The firmware keeps the long name as display_name and stores the file under
/// a FAT 8.3 name: the first six letters, `~n`, and a three-letter extension.
export function shortName(
  displayName: string,
  taken = new Set<string>(),
): string {
  const dot = displayName.lastIndexOf('.');
  const base = (dot > 0 ? displayName.slice(0, dot) : displayName)
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 6)
    .toUpperCase();
  const lower = displayName.toLowerCase();
  let ext = 'GCO';
  if (lower.endsWith('.bgcode')) ext = 'BGC';
  else if (lower.endsWith('.bbf')) ext = 'BBF';
  for (let n = 1; ; n++) {
    const candidate = `${base}~${String(n)}.${ext}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
}
