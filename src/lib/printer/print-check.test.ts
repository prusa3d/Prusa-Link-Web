import { describe, expect, it } from 'vitest';

import {
  choose,
  joinable,
  type Printer,
  prune,
  rank,
  resolve,
  type RowStatus,
  type State,
} from './print-check';
import {
  gcodeFilaments,
  type GcodeFilament,
  type Mapping,
  type PrinterTool,
  suggest,
} from './tool-mapping';

const RED = '#d62728';
const BLUE = '#1f77b4';
const PURPLE = '#9467bd';
const GREEN = '#2ca02c';
const WHITE = '#ffffff';

const f = (
  index: number,
  material: string,
  color?: string,
  more: Partial<GcodeFilament> = {},
): GcodeFilament => ({ index, material, color, nozzle: 0.4, ...more });

const s = (
  index: number,
  material: string | undefined,
  color?: string,
  more: Partial<PrinterTool> = {},
): PrinterTool => ({
  index,
  id: String(index - 1),
  material,
  color,
  nozzle: 0.4,
  hardened: false,
  highFlow: false,
  ...more,
});

interface Case {
  name: string;
  filaments: GcodeFilament[];
  printer: Printer;
  /// Unset: the page's suggestion.
  mapping?: Mapping;
  suggested?: Mapping;
  rows: RowStatus[];
  issues?: string[];
  changes?: number[];
  /// Backups' statuses, per row.
  backups?: RowStatus[][];
  unloadable?: number[];
  state: State;
}

const XL5 = [
  s(1, 'PLA', RED),
  s(2, 'PETG', BLUE),
  s(3, 'PLA', GREEN),
  s(4, 'ASA', RED),
  s(5, 'FLEX', PURPLE),
];

const CASES: Case[] = [
  {
    name: 'XL, every filament loaded as sliced',
    filaments: [f(1, 'PLA', RED), f(2, 'PETG', BLUE), f(3, 'ASA', RED)],
    printer: { slots: XL5 },
    suggested: { 1: [1], 2: [2], 3: [4] },
    rows: ['match', 'match', 'match'],
    state: 'ok',
  },
  {
    name: 'same material in another colour is no issue',
    filaments: [f(1, 'PETG', RED)],
    printer: { slots: [s(1, 'PETG', BLUE), s(2, 'PLA', RED)] },
    suggested: { 1: [1] },
    rows: ['colour'],
    state: 'ok',
  },
  {
    name: 'red and purple ASA are other colours, not similar',
    filaments: [f(1, 'ASA', RED)],
    printer: { slots: [s(1, 'ASA', PURPLE)] },
    rows: ['colour'],
    state: 'ok',
  },
  {
    name: 'INDX: materials that need changing',
    filaments: [
      f(1, 'PLA', '#F58231'),
      f(2, 'PETG', BLUE),
      f(3, 'PLA', GREEN),
      f(4, 'ASA', RED),
    ],
    printer: {
      slots: [
        s(1, 'PLA', '#F58231'),
        s(2, 'PLA', BLUE),
        s(3, 'PETG', GREEN),
        s(4, 'PETG', RED),
      ],
    },
    suggested: { 1: [1], 2: [3], 3: [2], 4: [4] },
    rows: ['match', 'colour', 'colour', 'change'],
    issues: ['wrongFilament:4'],
    changes: [4],
    state: 'change',
  },
  {
    name: 'an empty slot needs loading, wherever it is',
    filaments: [f(1, 'PLA', RED), f(2, 'PLA', BLUE)],
    printer: { slots: [s(1, undefined), s(2, 'PLA', BLUE)] },
    suggested: { 1: [1], 2: [2] },
    rows: ['empty', 'match'],
    issues: ['filamentNotLoaded:1'],
    changes: [1],
    state: 'change',
  },
  {
    name: 'a slot of unknown material counts as empty',
    filaments: [f(1, 'PLA')],
    printer: { slots: [s(1, undefined), s(2, undefined)] },
    rows: ['empty'],
    state: 'change',
  },
  {
    name: 'two identical filaments get two slots',
    filaments: [f(1, 'PLA', WHITE), f(2, 'PLA', WHITE)],
    printer: { slots: [s(1, 'PLA', WHITE), s(2, 'PLA', WHITE)] },
    suggested: { 1: [1], 2: [2] },
    rows: ['match', 'match'],
    state: 'ok',
  },
  {
    name: 'no colours in the file: material alone decides',
    filaments: [f(1, 'PLA'), f(2, 'PETG')],
    printer: { slots: [s(1, 'PETG', RED), s(2, 'PLA', BLUE)] },
    suggested: { 1: [2], 2: [1] },
    rows: ['match', 'match'],
    state: 'ok',
  },
  {
    name: 'more filaments than tools: a warning, the rest unmapped aborts',
    filaments: [f(1, 'PLA'), f(2, 'PLA'), f(3, 'PLA')],
    printer: { slots: [s(1, 'PLA'), s(2, 'PLA')] },
    suggested: { 1: [1], 2: [2] },
    rows: ['match', 'match', 'unmapped'],
    issues: ['notEnoughTools', 'unmapped:3'],
    state: 'abort',
  },
  {
    name: 'single tool, four filaments: not enough tools is a warning (M600)',
    filaments: [f(1, 'PLA'), f(2, 'PLA'), f(3, 'PLA'), f(4, 'PLA')],
    printer: { slots: [] },
    rows: ['match', 'match', 'match', 'match'],
    issues: ['notEnoughTools'],
    state: 'warning',
  },
  {
    name: '0.6 file on 0.4 nozzles warns',
    filaments: [f(1, 'PLA', undefined, { nozzle: 0.6 })],
    printer: { slots: [s(1, 'PLA')], nozzleCheck: 'warning' },
    rows: ['match'],
    issues: ['nozzleDiameter:1'],
    state: 'warning',
  },
  {
    name: '0.6 file on 0.4 nozzles aborts when the printer is set so',
    filaments: [f(1, 'PLA', undefined, { nozzle: 0.6 })],
    printer: { slots: [s(1, 'PLA'), s(2, 'PLA')], nozzleCheck: 'abort' },
    mapping: { 1: [1] },
    rows: ['incompatible'],
    issues: ['nozzleDiameter:1'],
    state: 'abort',
  },
  {
    name: 'nozzle checks ignored',
    filaments: [f(1, 'PLA', undefined, { nozzle: 0.6 })],
    printer: { slots: [s(1, 'PLA')], nozzleCheck: 'ignore' },
    rows: ['match'],
    state: 'ok',
  },
  {
    name: 'high-flow file on a standard nozzle',
    filaments: [f(1, 'PLA', undefined, { highFlow: true })],
    printer: { slots: [s(1, 'PLA')] },
    rows: ['match'],
    issues: ['nozzleHighFlow:1'],
    state: 'warning',
  },
  {
    name: 'abrasive filament on a nozzle that is not hardened',
    filaments: [f(1, 'PLA', undefined, { abrasive: true })],
    printer: { slots: [s(1, 'PLA')] },
    rows: ['match'],
    issues: ['nozzleHardened:1'],
    state: 'warning',
  },
  {
    name: 'abrasive filament prefers the hardened tool',
    filaments: [f(1, 'PLA', undefined, { abrasive: true })],
    printer: {
      slots: [s(1, 'PLA'), s(2, 'PLA', undefined, { hardened: true })],
    },
    suggested: { 1: [2] },
    rows: ['match'],
    state: 'ok',
  },
  {
    name: 'a disabled dock is never suggested, and a gap keeps numbers',
    filaments: [f(1, 'ASA'), f(2, 'FLEX')],
    printer: {
      slots: [
        s(1, 'PLA'),
        s(2, 'PETG'),
        s(3, undefined, undefined, { disabled: true }),
        s(4, 'ASA'),
        s(5, 'FLEX'),
      ],
    },
    suggested: { 1: [4], 2: [5] },
    rows: ['match', 'match'],
    state: 'ok',
  },
  {
    name: 'mapped onto a disabled tool aborts',
    filaments: [f(1, 'PLA')],
    printer: { slots: [s(1, 'PLA', undefined, { disabled: true })] },
    mapping: { 1: [1] },
    rows: ['incompatible'],
    issues: ['wrongTool:1'],
    state: 'abort',
  },
  {
    name: 'a file for another printer, by the printer’s model check',
    filaments: [],
    printer: { slots: [], modelFits: false, modelCheck: 'abort' },
    rows: [],
    issues: ['model'],
    state: 'abort',
  },
  {
    name: 'a file for another printer that only warns',
    filaments: [],
    printer: { slots: [], modelFits: false },
    rows: [],
    issues: ['model'],
    state: 'warning',
  },
  {
    name: 'the person unmapped a filament',
    filaments: [f(1, 'PLA')],
    printer: { slots: [s(1, 'PLA')] },
    mapping: {},
    rows: ['unmapped'],
    issues: ['unmapped:1'],
    state: 'abort',
  },
  {
    name: 'a TPU file on a FLEX slot is the wrong filament (exact names)',
    filaments: [f(1, 'TPU')],
    printer: { slots: [s(1, 'FLEX'), s(2, 'PLA')] },
    mapping: { 1: [1] },
    rows: ['change'],
    issues: ['wrongFilament:1'],
    changes: [1],
    unloadable: [1],
    state: 'change',
  },
  {
    name: 'a filament the printer has no preset for cannot be loaded',
    filaments: [f(1, 'PLA+')],
    printer: { slots: [s(1, 'PLA'), s(2, 'PLA')] },
    mapping: { 1: [1] },
    rows: ['change'],
    unloadable: [1],
    state: 'change',
  },
  {
    name: 'a file without filament types: any loaded slot fits',
    filaments: [f(1, ''), f(2, '')],
    printer: { slots: [s(1, 'PLA'), s(2, 'PETG')] },
    suggested: { 1: [1], 2: [2] },
    rows: ['match', 'match'],
    state: 'ok',
  },
  {
    name: 'a file without filament types on an empty slot: nothing to load',
    filaments: [f(1, '')],
    printer: { slots: [s(1, undefined), s(2, undefined)] },
    mapping: { 1: [1] },
    rows: ['empty'],
    unloadable: [1],
    state: 'change',
  },
  {
    name: 'XL, single-extruder file: mapped to the best tool',
    filaments: [f(1, 'PETG', BLUE)],
    printer: { slots: XL5 },
    suggested: { 1: [2] },
    rows: ['match'],
    state: 'ok',
  },
  {
    name: 'XL with only dock 3 enabled maps there',
    filaments: [f(1, 'PLA')],
    printer: {
      slots: [
        s(1, undefined, undefined, { disabled: true }),
        s(2, undefined, undefined, { disabled: true }),
        s(3, 'PLA'),
      ],
    },
    suggested: { 1: [3] },
    rows: ['match'],
    state: 'ok',
  },
  {
    name: 'MMU3: a 0.6 file on the 0.4 head is refused at abort',
    filaments: [
      f(1, 'PLA', undefined, { nozzle: 0.6 }),
      f(2, 'PLA', undefined, { nozzle: 0.6 }),
    ],
    printer: {
      slots: [1, 2, 3, 4, 5].map((n) => s(n, 'PLA')),
      nozzleCheck: 'abort',
    },
    mapping: { 1: [1], 2: [2] },
    rows: ['incompatible', 'incompatible'],
    issues: ['nozzleDiameter:1', 'nozzleDiameter:2'],
    state: 'abort',
  },
  {
    name: 'backup of another material: changed with the primary',
    filaments: [f(1, 'PLA')],
    printer: { slots: [s(1, 'PLA'), s(2, 'PETG')] },
    mapping: { 1: [1, 2] },
    rows: ['match'],
    backups: [['change']],
    issues: ['wrongFilament:1'],
    changes: [2],
    state: 'change',
  },
  {
    name: 'backup on another nozzle aborts like a primary would',
    filaments: [f(1, 'PLA')],
    printer: {
      slots: [s(1, 'PLA'), s(2, 'PLA', undefined, { nozzle: 0.6 })],
      nozzleCheck: 'abort',
    },
    mapping: { 1: [1, 2] },
    rows: ['match'],
    backups: [['incompatible']],
    issues: ['nozzleDiameter:1'],
    state: 'abort',
  },
  {
    name: 'a primary to change and an empty backup: both in the change',
    filaments: [f(1, 'ASA', RED)],
    printer: { slots: [s(1, 'PLA'), s(2, undefined)] },
    mapping: { 1: [1, 2] },
    rows: ['change'],
    backups: [['empty']],
    changes: [1, 2],
    state: 'change',
  },
];

describe('resolve', () => {
  it.each(CASES)('$name', (c) => {
    const severity = c.printer.nozzleCheck;
    const mapping =
      c.mapping ?? suggest(c.filaments, c.printer.slots, severity);
    if (c.suggested) expect(mapping).toEqual(c.suggested);
    const r = resolve(c.filaments, mapping, c.printer);
    expect(r.rows.map((row) => row.status)).toEqual(c.rows);
    if (c.issues)
      expect(
        r.issues.map((i) =>
          i.filament ? `${i.key}:${String(i.filament)}` : i.key,
        ),
      ).toEqual(c.issues);
    if (c.changes)
      expect(r.changes.map((x) => x.slot.index)).toEqual(c.changes);
    if (c.backups)
      expect(r.rows.map((row) => row.backups.map((b) => b.status))).toEqual(
        c.backups,
      );
    if (c.unloadable)
      expect(r.unloadable.map((x) => x.index)).toEqual(c.unloadable);
    expect(r.state).toBe(c.state);
  });

  it('says what each issue is about', () => {
    const r = resolve(
      [f(4, 'ASA')],
      { 4: [4] },
      {
        slots: [s(4, 'PETG', undefined, { nozzle: 0.6 })],
      },
    );
    expect(r.issues).toEqual([
      {
        key: 'nozzleDiameter',
        level: 'warning',
        filament: 4,
        slot: 4,
        has: '0.6',
        needs: '0.4',
      },
      {
        key: 'wrongFilament',
        level: 'warning',
        filament: 4,
        slot: 4,
        has: 'PETG',
        needs: 'ASA',
      },
    ]);
  });

  it('leaves out a filament the file does not use (0 g)', () => {
    const used = gcodeFilaments({
      'filament used [g]': '5.00, 0.00, 2.00',
      filament_type: 'PLA;PETG;ASA',
    });
    expect(used.map((x) => x.index)).toEqual([1, 3]);
  });
});

describe('choose', () => {
  const mapping: Mapping = { 1: [1, 5], 2: [2], 3: [3] };

  it('swaps when the slot is another filament’s', () => {
    expect(choose(mapping, 1, 2)).toEqual({ 1: [2, 5], 2: [1], 3: [3] });
  });

  it('takes a backup slot away from its filament', () => {
    expect(choose(mapping, 3, 5)).toEqual({ 1: [1], 2: [2], 3: [5] });
  });

  it('unmaps', () => {
    expect(choose(mapping, 2, undefined)).toEqual({ 1: [1, 5], 3: [3] });
  });
});

describe('joinable', () => {
  const pla = f(1, 'PLA', RED);
  it('offers free slots of the primary’s nozzle and flags the printer takes', () => {
    const slots = [
      s(1, 'PLA', RED),
      s(2, 'PLA', BLUE),
      s(3, 'PETG', RED),
      s(4, 'PLA', RED, { highFlow: true }),
      s(5, 'PLA', RED, { nozzle: 0.6 }),
      s(6, 'PLA', GREEN),
      s(7, 'PLA', RED, { disabled: true }),
      s(8, undefined),
    ];
    expect(
      joinable(pla, slots[0]!, slots, { 1: [1], 2: [6] }).map((x) => x.index),
    ).toEqual([2, 3, 8]);
  });

  it('judges against the G-code filament, not the primary’s', () => {
    const slots = [s(1, 'PETG'), s(2, 'PLA'), s(3, 'PETG')];
    expect(
      joinable(pla, slots[0]!, slots, { 1: [1] }).map((x) => x.index),
    ).toEqual([2, 3]);
  });
});

describe('prune', () => {
  it('drops backups that no longer suit a changed primary', () => {
    const slots = [
      s(1, 'PLA'),
      s(2, 'PLA', undefined, { nozzle: 0.6 }),
      s(3, 'PLA'),
    ];
    const filaments = [f(1, 'PLA')];
    expect(prune({ 1: [2, 3] }, filaments, slots)).toEqual({ 1: [2] });
    expect(prune({ 1: [1, 3] }, filaments, slots)).toEqual({ 1: [1, 3] });
  });
});

describe('rank', () => {
  const slots = [
    s(1, 'PLA', RED),
    s(2, 'PETG', BLUE),
    s(3, 'PLA', PURPLE),
    s(4, undefined),
    s(5, 'PLA', BLUE),
    s(6, 'PLA', BLUE, { nozzle: 0.6 }),
    s(7, 'PETG', PURPLE),
  ];
  const ids = (groups: ReturnType<typeof rank>) =>
    groups.map((g) => g.map((o) => o.slot.index));

  it('lists ready slots by colour, then changes by colour, then refusals', () => {
    expect(ids(rank(f(1, 'PLA', BLUE), slots, 'abort'))).toEqual([
      [5, 3, 1],
      // An empty slot (no colour) before a far colour.
      [2, 4, 7],
      [6],
    ]);
  });

  it('puts nozzle warnings after the slots without them', () => {
    expect(ids(rank(f(1, 'PLA', BLUE), slots, 'warning'))).toEqual([
      [5, 3, 1, 6],
      [2, 4, 7],
      [],
    ]);
  });

  it('breaks a tie by the slot of the filament’s own number', () => {
    const twins = [s(1, 'PLA', RED), s(2, 'PLA', RED), s(3, 'PLA', RED)];
    expect(ids(rank(f(2, 'PLA', RED), twins, 'warning'))[0]).toEqual([2, 1, 3]);
  });

  it('says why a slot is refused', () => {
    const [, , refused] = rank(f(1, 'PLA', BLUE), slots, 'abort');
    expect(refused[0]?.issues[0]).toMatchObject({
      key: 'nozzleDiameter',
      has: '0.6',
    });
  });
});
