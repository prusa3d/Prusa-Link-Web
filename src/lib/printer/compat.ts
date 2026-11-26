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
  '5.1.0': 'xls',
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

/// False when the file is for another printer; undefined when either side
/// is unknown.
export function fitsPrinter(
  sliced: string | undefined,
  code: string | undefined,
): boolean | undefined {
  const file = sliced ? slicedGroup(sliced) : undefined;
  const printer = code ? BY_CODE[code] : undefined;
  if (!file || !printer) return undefined;
  for (let g: Group | undefined = printer; g; g = UPGRADE_FROM[g])
    if (g === file) return true;
  return false;
}
