import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { readHeader } from '../files/header';
import {
  ciede2000,
  colourDistance,
  fit,
  gcodeFilaments,
  type GcodeFilament,
  type PrinterTool,
  suggest,
  toApi,
} from './tool-mapping';

const fixture = (name: string) =>
  new Blob([
    readFileSync(new URL(`../../../mock/fixtures/${name}`, import.meta.url)),
  ]).stream();

/// The INDX sample's four extruders, each used, as a slicer writes them.
const INDX = {
  'filament used [g]': '18.55, 2.10, 3.00, 0.80',
  filament_type: 'PLA;PLA;PLA;PLA',
  extruder_colour: '#F58231;#1F77B4;#2CA02C;#D62728',
  nozzle_diameter: '0.4,0.4,0.4,0.4',
  nozzle_high_flow: '1,1,1,1',
  filament_abrasive: '0,0,0,0',
};

const tool = (index: number, more: Partial<PrinterTool> = {}): PrinterTool => ({
  index,
  material: 'PLA',
  nozzle: 0.4,
  highFlow: true,
  hardened: false,
  ...more,
});

const filament = (
  index: number,
  more: Partial<GcodeFilament> = {},
): GcodeFilament => ({ index, material: 'PLA', nozzle: 0.4, ...more });

describe('gcodeFilaments', () => {
  it('reads the used extruders as Connect does; under 0.03 g is unused', async () => {
    const header = await readHeader(fixture('three-shapes.bgcode'));
    expect(gcodeFilaments(header)).toEqual([
      {
        index: 1,
        material: 'PLA',
        color: '#F58231',
        grams: 18.55,
        nozzle: 0.4,
        highFlow: true,
        abrasive: false,
      },
    ]);
    expect(gcodeFilaments(INDX).map((f) => f.index)).toEqual([1, 2, 3, 4]);
  });

  it('has nothing to map in a single-extruder file', () => {
    expect(gcodeFilaments({ 'filament used [g]': '12.5' })).toEqual([]);
  });

  it('does not trust a per-extruder value with too few items', () => {
    const [first] = gcodeFilaments({ ...INDX, extruder_colour: '#F58231' });
    expect(first?.color).toBeUndefined();
  });
});

describe('colours', () => {
  it('measures CIEDE2000 like Sharma, Wu and Dalal', () => {
    expect(ciede2000([50, 2.6772, -79.7751], [50, 0, -82.7485])).toBeCloseTo(
      2.0425,
      3,
    );
    expect(ciede2000([50, 0, 0], [50, -1, 2])).toBeCloseTo(2.3669, 3);
    expect(
      ciede2000([60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387]),
    ).toBeCloseTo(1.2644, 3);
  });

  it('has no distance without both colours', () => {
    expect(colourDistance('#ff0000', undefined)).toBe(Infinity);
    expect(colourDistance('#ff0000', '#ff0000')).toBe(0);
  });
});

describe('suggest', () => {
  const indx = gcodeFilaments(INDX);
  const loaded = ['#F58231', '#1F77B4', '#2CA02C', '#D62728'];

  it('maps 1:1 when every tool already matches', () => {
    const tools = loaded.map((color, i) => tool(i + 1, { color }));
    expect(suggest(indx, tools)).toEqual({ 1: [1], 2: [2], 3: [3], 4: [4] });
  });

  it('follows the colours when the tools hold them in another order', () => {
    const tools = [...loaded]
      .reverse()
      .map((color, i) => tool(i + 1, { color }));
    expect(suggest(indx, tools)).toEqual({ 1: [4], 2: [3], 3: [2], 4: [1] });
  });

  it('takes the nearest colour, and the same material before any colour', () => {
    const f = [filament(1, { color: '#ff0000' })];
    expect(
      suggest(f, [
        tool(1, { color: '#0000ff' }),
        tool(2, { color: '#ee1111' }),
        tool(3, { material: 'PETG', color: '#ff0000' }),
      ]),
    ).toEqual({ 1: [2] });
  });

  it('keeps 1:1 on a tie, as when no colours are known', () => {
    const f = [filament(1), filament(2)];
    expect(suggest(f, [tool(1), tool(2)])).toEqual({ 1: [1], 2: [2] });
  });

  it('finds the best whole mapping, not the greedy one', () => {
    // Extruder 1 is a bit nearer to tool 1, but extruder 2 matches only it.
    const f = [
      filament(1, { color: '#ff0000' }),
      filament(2, { color: '#fe0000' }),
    ];
    const tools = [
      tool(1, { color: '#ff0000' }),
      tool(2, { color: '#ff3300', material: 'PLA' }),
    ];
    const mapping = suggest(f, tools);
    expect(new Set(Object.values(mapping).flat())).toEqual(new Set([1, 2]));
  });

  it('puts a tool with another nozzle last, and never when the printer aborts on it', () => {
    const f = [filament(1)];
    const tools = [tool(1, { nozzle: 0.6 }), tool(2, { material: 'PETG' })];
    expect(suggest(f, tools)).toEqual({ 1: [2] });
    expect(suggest(f, [tool(1, { nozzle: 0.6 })])).toEqual({ 1: [1] });
    expect(suggest(f, [tool(1, { nozzle: 0.6 })], 'abort')).toEqual({});
    expect(fit(f[0]!, tool(1, { nozzle: 0.6 }))).toBe('nozzle');
    expect(fit(f[0]!, tool(1, { nozzle: 0.6 }), 'ignore')).toBe('exact');
  });

  it('wants a hardened nozzle for an abrasive filament and high flow for a high-flow file', () => {
    const abrasive = filament(1, { abrasive: true, highFlow: true });
    expect(fit(abrasive, tool(1))).toBe('nozzle');
    expect(fit(abrasive, tool(1, { hardened: true }))).toBe('exact');
    expect(fit(abrasive, tool(1, { hardened: true, highFlow: false }))).toBe(
      'nozzle',
    );
  });

  it('leaves an extruder unmapped when no tool is left for it', () => {
    const f = [filament(1), filament(2), filament(3)];
    const tools = [tool(1), tool(2, { disabled: true })];
    expect(suggest(f, tools)).toEqual({ 1: [1] });
  });

  it('suggests the five-tool XL with different materials by type', () => {
    const xl = ['PLA', 'PETG', 'PLA', 'ASA', 'FLEX'].map((material, i) =>
      tool(i + 1, { material, highFlow: false }),
    );
    const f = [
      filament(1, { material: 'ASA' }),
      filament(2, { material: 'TPU' }),
      filament(3, { material: 'PLA' }),
    ];
    expect(suggest(f, xl)).toEqual({ 1: [4], 2: [5], 3: [3] });
  });
});

describe('toApi', () => {
  it('sends Connect’s tool_mapping', () => {
    expect(toApi({ 1: [3, 5], 2: [1], 3: [] })).toEqual({
      '1': [3, 5],
      '2': [1],
    });
  });
});
