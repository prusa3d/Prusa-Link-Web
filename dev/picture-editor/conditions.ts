/// When a part or a label shows: with an MMU, with an enclosure, when the
/// printer reports a chamber temperature, with at least, at most or exactly
/// N tools, with tool N (`T3`: an XL may leave docks empty); `!` negates
/// one, `&` joins them, `|` separates alternatives.
export type Condition = string;

const ATOM = String.raw`!?(?:mmu|enclosure|chamber|tools(?:>=|<=|=)[1-8]|T[1-8])`;
const SYNTAX = new RegExp(
  String.raw`^${ATOM}(?:&${ATOM})*(?:\|${ATOM}(?:&${ATOM})*)*$`,
);

/// The conditions offered in the editor's lists; any other in the syntax
/// can be typed.
export const CONDITIONS: readonly Condition[] = [
  'mmu',
  'enclosure',
  '!enclosure',
  'chamber',
  ...[2, 3, 4, 5, 6, 7, 8].map((n) => `tools>=${String(n)}`),
  ...[1, 2, 3, 4].map((n) => `tools<=${String(n)}`),
  ...[1, 2, 3, 4, 5].map((n) => `tools=${String(n)}`),
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `T${String(n)}`),
];

export function parseCondition(value: unknown): Condition | undefined {
  return typeof value === 'string' && SYNTAX.test(value) ? value : undefined;
}

export function conditionName(c: Condition | undefined): string {
  if (!c) return 'always';
  return c
    .split('|')
    .map((alt) =>
      alt
        .split('&')
        .map((atom) => {
          const not = atom.startsWith('!') ? 'no ' : '';
          const a = not ? atom.slice(1) : atom;
          const [, op, n = ''] = /^tools(>=|<=|=)(\d+)$/.exec(a) ?? [];
          if (op === '>=') return `${not}${n}+ tools`;
          if (op === '<=') return `${not}≤${n} tools`;
          if (op === '=') return `${not}${n} tool${n === '1' ? '' : 's'}`;
          if (/^T\d$/.test(a)) return `${not}${a}`;
          return not + (a === 'mmu' ? 'MMU' : a);
        })
        .join(' and '),
    )
    .join(' or ');
}

/// What the printer has, as the app would know it.
export interface Equipment {
  mmu: boolean;
  enclosure: boolean;
  chamber: boolean;
  /// How many tools are enabled.
  tools: number;
  /// Which, from 1.
  present: readonly number[];
}

/// As the app's `met` (src/lib/printer/status-picture.ts).
export function met(c: Condition | undefined, e: Equipment): boolean {
  return (
    !c ||
    c.split('|').some((alt) =>
      alt.split('&').every((atom) => {
        const not = atom.startsWith('!');
        const a = not ? atom.slice(1) : atom;
        const [, op, n] = /^tools(>=|<=|=)(\d+)$/.exec(a) ?? [];
        const tool = /^T(\d)$/.exec(a)?.[1];
        let has: boolean;
        if (tool) has = e.present.includes(Number(tool));
        else if (op === '>=') has = e.tools >= Number(n);
        else if (op === '<=') has = e.tools <= Number(n);
        else if (op === '=') has = e.tools === Number(n);
        else has = e[a as 'mmu' | 'enclosure' | 'chamber'];
        return has !== not;
      }),
    )
  );
}

/// A label's own condition, else what its heater needs: tool n needs tool
/// n, the chamber needs a chamber.
export function labelCondition(
  heater: string,
  when: Condition | undefined,
): Condition | undefined {
  if (when) return when;
  if (heater === 'chamber') return 'chamber';
  const tool = /^T([2-8])$/.exec(heater)?.[1];
  return tool ? `T${tool}` : undefined;
}

/// Marks the elements with `ids` display="none" in an SVG string.
export function hideIds(svg: string, ids: readonly string[]): string {
  if (!ids.length) return svg;
  const set = new Set(ids);
  return svg.replace(/\bid="([^"]+)"/g, (attr, id: string) =>
    set.has(id) ? `${attr} display="none"` : attr,
  );
}
