import type { Status } from '../stores/printer.svelte';
import type { ToolInfo } from '../stores/identity.svelte';

/// One tool of a printer with several, from the expanded status and
/// /api/v1/info (PrusaLink 2).
export interface ToolRow {
  /// 0-based, as the API counts; people read T1 for 0.
  index: number;
  temp: number | undefined;
  target: number | undefined;
  active: boolean;
  material?: string | undefined;
  color?: string | undefined;
}

/// Every tool the expanded status reports, in order; MMU slots (`"0.N"`)
/// are not tools. Empty without the expanded status.
export function toolRows(
  status: Status | undefined,
  info: readonly (ToolInfo | undefined)[],
): ToolRow[] {
  return Object.entries(status?.tools ?? {})
    .flatMap(([key, t]) => (t && /^\d+$/.test(key) ? [[key, t] as const] : []))
    .map(([key, t]) => {
      const index = Number(key);
      const about = info[index];
      return {
        index,
        temp: t.nozzle_temp,
        target: t.nozzle_target_temp ?? undefined,
        active: t.active ?? false,
        material: about?.material,
        color: about?.color,
      };
    })
    .sort((a, b) => a.index - b.index);
}
