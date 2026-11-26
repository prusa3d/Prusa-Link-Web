/// Filament types as the firmware names them (src/common/filament_presets.cpp),
/// split like 3mf-generator's picker: the everyday ones first, the rest on
/// request. TPU is the firmware's FLEX.
export const BASIC_FILAMENTS = ['PLA', 'PETG', 'ABS', 'ASA', 'FLEX'] as const;
export const OTHER_FILAMENTS = [
  'PC',
  'PVB',
  'HIPS',
  'PP',
  'PA',
  'PPS',
  'PPA',
  'PVA',
  'BVOH',
] as const;

const ALIASES: Record<string, string> = {
  TPU: 'FLEX',
  TPE: 'FLEX',
  PET: 'PETG',
};

/// A slicer's or the printer's filament type in the firmware's words, so
/// "TPU" in a file name matches a printer reporting FLEX.
export function firmwareFilament(type: string): string {
  const upper = type.trim().toUpperCase();
  return ALIASES[upper] ?? upper;
}

/// The name people know a filament by.
export function filamentLabel(type: string): string {
  return type === 'FLEX' ? 'TPU' : type;
}

/// A firmware filament type PrusaLink can load, for a slicer's type.
export function loadableFilament(type: string | undefined): string | undefined {
  if (!type) return undefined;
  const name = firmwareFilament(type);
  return [...BASIC_FILAMENTS, ...OTHER_FILAMENTS].find((f) => f === name);
}
