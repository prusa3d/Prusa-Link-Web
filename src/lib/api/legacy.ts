import { firmwareFilament } from '../printer/filaments';

/// A file sliced for one material, while another is loaded. Files for several
/// materials (multi-tool) are left to the printer, which knows every tool.
export function materialMismatch(
  fileMaterials: string[],
  loaded: string | undefined,
): boolean {
  const wanted = [...new Set(fileMaterials.map(firmwareFilament))];
  return (
    loaded !== undefined &&
    wanted.length === 1 &&
    wanted[0] !== firmwareFilament(loaded)
  );
}
