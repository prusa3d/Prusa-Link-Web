import { queued } from './queue.svelte';
import { firmwareFilament } from '../printer/filaments';
import { session } from '../auth/session.svelte';

/// The loaded filament of the active tool, from the OctoPrint-compatible
/// `GET /api/printer` (`telemetry.material`), which the v1 spec lacks.
/// Undefined when unknown or nothing is loaded (`---`).
export async function loadedMaterial(): Promise<string | undefined> {
  try {
    const headers: Record<string, string> = {};
    if (session.key) headers['X-Api-Key'] = session.key;
    const body = await queued(async () => {
      const res = await fetch('/api/printer', { headers });
      return res.ok
        ? ((await res.json()) as { telemetry?: { material?: string } })
        : undefined;
    });
    if (!body) return undefined;
    const material = body.telemetry?.material?.trim().toUpperCase();
    return material && material !== '---' ? material : undefined;
  } catch {
    return undefined;
  }
}

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
