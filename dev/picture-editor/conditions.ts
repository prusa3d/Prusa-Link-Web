/// When a part or a label shows: with an MMU, with an enclosure, when the
/// printer reports a chamber temperature, or with at least N tools.
export type Condition =
  'mmu' | 'enclosure' | 'chamber' | `tools>=${2 | 3 | 4 | 5 | 6 | 7 | 8}`;

export const CONDITIONS: readonly Condition[] = [
  'mmu',
  'enclosure',
  'chamber',
  'tools>=2',
  'tools>=3',
  'tools>=4',
  'tools>=5',
  'tools>=6',
  'tools>=7',
  'tools>=8',
];

export function parseCondition(value: unknown): Condition | undefined {
  return CONDITIONS.find((c) => c === value);
}

export function conditionName(c: Condition | undefined): string {
  if (!c) return 'always';
  if (c === 'mmu') return 'MMU';
  if (c.startsWith('tools>=')) return `${c.slice(7)}+ tools`;
  return c;
}

/// What the printer has, as the app would know it.
export interface Equipment {
  mmu: boolean;
  enclosure: boolean;
  chamber: boolean;
  tools: number;
}

export function met(c: Condition | undefined, e: Equipment): boolean {
  if (!c) return true;
  if (c === 'mmu') return e.mmu;
  if (c === 'enclosure') return e.enclosure;
  if (c === 'chamber') return e.chamber;
  return e.tools >= Number(c.slice(7));
}

/// A label's own condition, else what its heater needs: tool n needs n
/// tools, the chamber needs a chamber.
export function labelCondition(
  heater: string,
  when: Condition | undefined,
): Condition | undefined {
  if (when) return when;
  if (heater === 'chamber') return 'chamber';
  const tool = /^T([2-8])$/.exec(heater)?.[1];
  return tool ? parseCondition(`tools>=${tool}`) : undefined;
}

/// Marks the elements with `ids` display="none" in an SVG string.
export function hideIds(svg: string, ids: readonly string[]): string {
  if (!ids.length) return svg;
  const set = new Set(ids);
  return svg.replace(/\bid="([^"]+)"/g, (attr, id: string) =>
    set.has(id) ? `${attr} display="none"` : attr,
  );
}
