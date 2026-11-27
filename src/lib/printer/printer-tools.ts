import type { components } from '../api/schema';

type Info = components['schemas']['Info'];
export type ToolEntry = components['schemas']['ToolInfo'];

/// The tools of /api/v1/info as the firmware lists them, Connect's tool
/// tree (and the names of Connect's printerTools helper): heads by their
/// 0-based id ("0", "1"…, null when disabled); a head's MMU is its
/// `feeder`, and its slots are "0.N" (FFF_FEEDER_SLOT), which have no
/// features of their own: they feed the head's nozzle.
export function printerTools(tools: Info['tools']) {
  const entries = Object.entries(tools ?? {});
  const heads = entries.filter(([id]) => !id.includes('.'));
  const head = tools?.['0'];
  return {
    /// More than one head (the XL, the INDX).
    isMultitool: () => heads.length > 1,
    /// An MMU on the first head, turned on.
    isMultiMaterial: () => head?.feeder?.type === 'MMU',
    /// Heads by id, null for a disabled one.
    tools: () =>
      heads.map(([id, tool]) => ({ toolId: Number(id), tool: tool ?? null })),
    /// The MMU and its slots, each with the head it feeds.
    mmu() {
      if (!this.isMultiMaterial() || !head?.feeder) return undefined;
      const slots = entries
        .filter(([id]) => id.startsWith('0.'))
        .map(([id, slot]) => ({
          slotId: Number(id.split('.')[1]),
          id,
          slot: slot ?? null,
        }));
      return { ...head.feeder, head, slots };
    },
  };
}
