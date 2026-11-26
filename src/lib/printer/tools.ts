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
  nozzle?: number | undefined;
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
        nozzle: about?.nozzle,
      };
    })
    .sort((a, b) => a.index - b.index);
}

/// Black or white, whichever reads on a filament's colour: Connect's
/// materialTextColor (WCAG relative luminance, threshold 0.5 as its mobile
/// app). Undefined without a colour.
export function textOn(color: string | undefined): string | undefined {
  const hex = /^#?([0-9a-f]{6})/i.exec(color ?? '')?.[1];
  if (!hex) return undefined;
  const linear = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [0, 2, 4].map((i) =>
    linear(parseInt(hex.slice(i, i + 2), 16)),
  );
  const luminance = 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
  return luminance > 0.5 ? '#000000' : '#ffffff';
}
