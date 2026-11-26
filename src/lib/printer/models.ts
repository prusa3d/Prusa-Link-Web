/// Printer models by the `printer` field of /api/version: the firmware's
/// type.version.subversion (include/common/printer_model_data.hpp in Buddy).
/// `variant` names the PrusaLink build for that firmware, the lowercase CMake
/// PRINTER without dots.

export type Variant =
  /// One build for every printer, until the firmware picks a printer's own.
  | 'generic'
  | 'mini'
  | 'mk35'
  | 'mk4'
  | 'xl'
  | 'ix'
  | 'coreone'
  | 'coreonel'
  | 'coreone_indx'
  | 'coreonel_indx';

export interface Model {
  name: string;
  variant: Variant;
}

export const MODELS: Readonly<Record<string, Model>> = {
  '1.3.5': { name: 'Original Prusa MK3.5', variant: 'mk35' },
  '1.3.6': { name: 'Original Prusa MK3.5S', variant: 'mk35' },
  '1.3.9': { name: 'Original Prusa MK3.9', variant: 'mk4' },
  '1.3.10': { name: 'Original Prusa MK3.9S', variant: 'mk4' },
  '1.4.0': { name: 'Original Prusa MK4', variant: 'mk4' },
  '1.4.1': { name: 'Original Prusa MK4S', variant: 'mk4' },
  '2.1.0': { name: 'Original Prusa MINI', variant: 'mini' },
  '3.1.0': { name: 'Original Prusa XL', variant: 'xl' },
  '5.1.0': { name: 'Original Prusa XL', variant: 'xl' },
  '4.1.0': { name: 'Prusa Pro iX', variant: 'ix' },
  '7.1.0': { name: 'Prusa CORE One', variant: 'coreone' },
  '7.2.0': { name: 'Prusa CORE One Signature Oak', variant: 'coreone' },
  '8.1.0': { name: 'Prusa CORE One L', variant: 'coreonel' },
  '7.10.0': { name: 'Prusa CORE One INDX', variant: 'coreone_indx' },
  '8.10.0': { name: 'Prusa CORE One L INDX', variant: 'coreonel_indx' },
};

export function modelOf(code: string | undefined): Model | undefined {
  return code === undefined ? undefined : MODELS[code];
}

/// "prusa-xl · Original Prusa XL", the hostname alone, or the model alone.
export function printerTitle(
  hostname: string | undefined,
  model: Model | undefined,
): string {
  return [hostname, model?.name].filter(Boolean).join(' · ');
}

/// Printers with several tools. PrusaLink reports the material of the picked
/// tool only, and "none" when no tool is picked (a parked XL), so the page
/// neither judges nor changes their filament: the printer maps tools to the
/// file's materials on its own screen.
export function isMultiTool(variant: Variant | undefined): boolean {
  return (
    variant === 'xl' ||
    variant === 'coreone_indx' ||
    variant === 'coreonel_indx'
  );
}
