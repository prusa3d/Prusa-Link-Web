/// Whether a file sliced for one printer runs on another, as prusa-connect's
/// printcompat (models.go) mirrors the firmware's printer_model check: the
/// same group fits, a newer printer runs an older one's files (some in a
/// compatibility mode), anything else is another printer.

type Group =
  | 'mk3'
  | 'mk3_5'
  | 'mk4'
  | 'mk4s'
  | 'mini'
  | 'xl'
  | 'xls'
  | 'ix'
  | 'coreone'
  | 'coreonel'
  | 'coreone_indx'
  | 'coreonel_indx';

/// The printer's group by its /api/version `printer` code.
const BY_CODE: Readonly<Record<string, Group>> = {
  '1.3.5': 'mk3_5',
  '1.3.6': 'mk3_5',
  '1.3.9': 'mk4',
  '1.3.10': 'mk4s',
  '1.4.0': 'mk4',
  '1.4.1': 'mk4s',
  '2.1.0': 'mini',
  '3.1.0': 'xl',
  '3.1.1': 'xls',
  '5.1.0': 'xl',
  '4.1.0': 'ix',
  '7.1.0': 'coreone',
  '7.2.0': 'coreone',
  '8.1.0': 'coreonel',
  '7.10.0': 'coreone_indx',
  '8.10.0': 'coreonel_indx',
};

const UPGRADE_FROM: Partial<Record<Group, Group>> = {
  xls: 'xl',
  mk3_5: 'mk3',
  mk4: 'mk3',
  mk4s: 'mk4',
  coreone: 'mk4s',
  coreonel: 'coreone',
};

/// A slicer's printer_model (`MK4S`, `MK4SMMU3`, `COREONE_INDX4T`, `XL5IS`,
/// `COREONELMMU3`…) by its group; undefined for one this page does not know.
export function slicedGroup(model: string): Group | undefined {
  const m = model.toUpperCase().replace(/[-_]/g, '');
  if (m.startsWith('COREONEL'))
    return m.includes('INDX') ? 'coreonel_indx' : 'coreonel';
  if (m.startsWith('COREONE'))
    return m.includes('INDX') ? 'coreone_indx' : 'coreone';
  if (m.startsWith('XLP')) return 'xls';
  if (m.startsWith('XL')) return 'xl';
  if (m.startsWith('MINI')) return 'mini';
  if (m.startsWith('IX')) return 'ix';
  if (/^MK3\.?5/.test(m)) return 'mk3_5';
  if (/^MK(4S|3\.?9S)/.test(m)) return 'mk4s';
  if (/^MK(4|3\.?9)/.test(m)) return 'mk4';
  if (m.startsWith('MK3')) return 'mk3';
  return undefined;
}

/// The firmware's printer ids (printer_model_data.hpp in Buddy), which the
/// start G-code's `M862.3 P "<id>"` names, by group; MMU variants belong to
/// their printer's.
const BY_ID: Readonly<Record<string, Group>> = {
  MK3: 'mk3',
  MK3S: 'mk3',
  MK3MMU2: 'mk3',
  MK3SMMU2S: 'mk3',
  'MK3.5': 'mk3_5',
  'MK3.5S': 'mk3_5',
  'MK3.5MMU3': 'mk3_5',
  'MK3.5SMMU3': 'mk3_5',
  'MK3.9': 'mk4',
  'MK3.9MMU3': 'mk4',
  'MK3.9S': 'mk4s',
  'MK3.9SMMU3': 'mk4s',
  MK4: 'mk4',
  MK4MMU3: 'mk4',
  MK4S: 'mk4s',
  MK4SMMU3: 'mk4s',
  MINI: 'mini',
  XL: 'xl',
  XLP: 'xls',
  iX: 'ix',
  COREONE: 'coreone',
  COREONEMMU3: 'coreone',
  COREONEOAK: 'coreone',
  COREONEL: 'coreonel',
  COREONELMMU3: 'coreonel',
  COREONEINDX: 'coreone_indx',
  'COREONEL-INDX': 'coreonel_indx',
};

/// False when the file is for another printer; undefined when either side
/// is unknown. The start G-code's printer id (`M862.3`) decides, as on the
/// printer, where the file says it (fitsById); without one (a binary
/// G-code, whose start G-code is compressed), the slicer's printer_model,
/// read like printcompat does.
export function fitsPrinter(
  sliced: string | undefined,
  code: string | undefined,
): boolean | undefined {
  return fits(sliced ? slicedGroup(sliced) : undefined, code);
}

/// Whether the start G-code's `M862.3 P "<id>"` fits this printer, as the
/// firmware's model check: an id it does not know is another printer's.
export function fitsById(
  id: string,
  code: string | undefined,
): boolean | undefined {
  if (code && BY_CODE[code] && !BY_ID[id]) return false;
  return fits(BY_ID[id], code);
}

function fits(
  file: Group | undefined,
  code: string | undefined,
): boolean | undefined {
  const printer = code ? BY_CODE[code] : undefined;
  if (!file || !printer) return undefined;
  for (let g: Group | undefined = printer; g; g = UPGRADE_FROM[g])
    if (g === file) return true;
  return false;
}
