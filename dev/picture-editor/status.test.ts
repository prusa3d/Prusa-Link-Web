import { describe, expect, it } from 'vitest';

import type { Point } from './geometry.ts';
import {
  comparePaths,
  diffVariant,
  emptyEdits,
  isInherited,
  resolveVariant,
  defaultStyle,
  dragBed,
  flipLabel,
  heatersFor,
  labelLayout,
  labelLength,
  newLabel,
  normalizeBed,
  normalizeBedArea,
  normalizeLabel,
  parseStatus,
  scopeIds,
  serializeStatus,
  type StatusPicture,
} from './status.ts';

describe('labels', () => {
  it('runs the line away from the anchor', () => {
    expect(newLabel('T1', [100, 300], [150, 200], 60)).toEqual({
      heater: 'T1',
      anchor: [100, 300],
      elbow: [150, 200],
      end: [210, 200],
      side: 'right',
    });
    expect(newLabel('bed', [500, 600], [400, 550], 60).end).toEqual([340, 550]);
    expect(newLabel('bed', [500, 600], [400, 550], 60).side).toBe('left');
  });

  it('flips around the elbow and keeps the line horizontal', () => {
    const l = flipLabel(newLabel('T1', [0, 0], [10, -10], 60));
    expect(l.end).toEqual([-50, -10]);
    expect(l.side).toBe('left');
    expect(normalizeLabel({ ...l, end: [30, 99] })).toMatchObject({
      end: [30, -10],
      side: 'right',
    });
  });

  it('offers one tool to single-tool printers', () => {
    expect(heatersFor('coreone')).toEqual(['T1', 'bed', 'chamber']);
    expect(heatersFor('xl')).toHaveLength(7);
    expect(heatersFor('coreone_indx')).toHaveLength(10);
  });
});

describe('status JSON', () => {
  const status: StatusPicture = {
    source: 'coreone.svg',
    viewBox: '0 0 1000 1000',
    style: { value: 60, caption: 30, stroke: 4 },
    labels: [
      newLabel('T1', [520, 330], [600, 150], 60),
      newLabel('bed', [300, 690], [250, 720], 60),
      { ...newLabel('T2', [700, 330], [760, 150], 60), when: 'tools>=3' },
    ],
    conditional: [{ id: 'a', when: 'mmu' }],
    edits: {
      hidden: ['12', '3', '3.1'],
      transforms: {
        '40': [1, 1, 0, -10],
        '7': [1, 1, 0, 0],
        'g:a': [2, 1, -5, 0],
      },
      structure: [
        { op: 'group', id: 'a', name: 'A', members: ['3', '4'] },
        { op: 'move', keys: ['4'], into: null },
      ],
      conditions: { 'g:a': 'mmu', '2': 'enclosure' },
    },
  };

  it('round-trips', () => {
    const back = parseStatus(serializeStatus(status));
    expect(back.labels).toEqual(status.labels);
    expect(back.viewBox).toBe('0 0 1000 1000');
    expect(back.style).toEqual(status.style);
    expect(back.edits).toEqual({
      hidden: ['3', '3.1', '12'],
      transforms: { '40': [1, 1, 0, -10], 'g:a': [2, 1, -5, 0] },
      structure: status.edits.structure,
      conditions: { '2': 'enclosure', 'g:a': 'mmu' },
    });
    expect(back.conditional).toEqual(status.conditional);
  });

  it('fills in a missing style from the viewBox', () => {
    expect(parseStatus('{"viewBox":"0 0 500 400"}').style).toEqual({
      value: 30,
      caption: 15,
      stroke: 2,
    });
  });

  it('writes the documented shape', () => {
    const json = JSON.parse(serializeStatus(status)) as Record<string, unknown>;
    expect(Object.keys(json)).toEqual([
      'source',
      'viewBox',
      'style',
      'labels',
      'conditional',
      'edits',
    ]);
    expect((json.labels as unknown[])[0]).toEqual({
      heater: 'T1',
      anchor: [520, 330],
      elbow: [600, 150],
      end: [660, 150],
      side: 'right',
    });
  });

  it('rejects broken files', () => {
    expect(() => parseStatus('{"labels":[{"heater":"T9"}]}')).toThrow();
    expect(() =>
      parseStatus(
        '{"labels":[{"heater":"bed","anchor":[1],"elbow":[0,0],"end":[0,0]}]}',
      ),
    ).toThrow();
    expect(parseStatus('{}').edits).toEqual({
      hidden: [],
      transforms: {},
      structure: [],
      conditions: {},
    });
    expect(
      parseStatus('{"edits":{"conditions":{"1":"wings"}}}').edits.conditions,
    ).toEqual({});
  });
});

describe('helpers', () => {
  it('orders paths numerically, parents first', () => {
    expect(['10', '2.1', '2', '1'].sort(comparePaths)).toEqual([
      '1',
      '2',
      '2.1',
      '10',
    ]);
  });

  it('scopes ids and their references', () => {
    expect(
      scopeIds('<g id="a" fill="url(#a)"><use href="#a"/></g>', 'p-'),
    ).toBe('<g id="p-a" fill="url(#p-a)"><use href="#p-a"/></g>');
  });
});

describe('label layout', () => {
  const style = { value: 60, caption: 30, stroke: 4 };
  const label = newLabel('T1', [100, 300], [150, 200], labelLength(style));

  it('puts the value above the line and the caption below it', () => {
    const l = labelLayout(label, style);
    expect(label.end[0] - label.elbow[0]).toBe(180);
    expect(l.textX).toBe(240);
    expect(l.valueY).toBeLessThan(200);
    expect(l.captionY - style.caption * 0.75).toBeGreaterThan(200);
  });

  it('sizes the default style for a 600 px wide picture', () => {
    expect(defaultStyle({ x: 0, y: 0, width: 1000, height: 1000 })).toEqual(
      style,
    );
  });
});

describe('older status files', () => {
  it('read moves as transforms and drop trimming and centring', () => {
    const s = parseStatus(
      '{"edits":{"moves":{"4":[2,3]},"trim":20,"centre":{"x":500}}}',
    );
    expect(s.edits.transforms).toEqual({ '4': [1, 1, 2, 3] });
    expect(Object.keys(s.edits)).toEqual([
      'hidden',
      'transforms',
      'structure',
      'conditions',
    ]);
  });
});

describe('variants', () => {
  const style = { value: 60, caption: 30, stroke: 4 };
  const t1 = newLabel('T1', [100, 300], [150, 200], 60);
  const bed = newLabel('bed', [500, 700], [450, 650], 60);
  const base = { labels: [t1, bed], style };

  it('inherit the base until changed', () => {
    expect(resolveVariant(base, { labels: {} })).toEqual(base);
    expect(diffVariant(base, [t1, bed], style)).toEqual({ labels: {} });
    expect(isInherited(t1, base.labels)).toBe(true);
  });

  it('keep moved, dropped and added labels and their own sizes', () => {
    const moved = { ...t1, anchor: [110, 310] as Point };
    const chamber = newLabel('chamber', [600, 200], [650, 120], 60);
    const big = { ...style, value: 80 };
    const o = diffVariant(base, [moved, chamber], big);
    expect(o).toEqual({
      style: big,
      labels: { T1: moved, bed: null, chamber },
    });
    expect(isInherited(moved, base.labels)).toBe(false);
    expect(resolveVariant(base, o)).toEqual({
      labels: [moved, chamber],
      style: big,
    });
  });

  it('follow later base changes that they did not override', () => {
    const o = diffVariant(base, [{ ...t1, anchor: [1, 2] }, bed], style);
    const newBed = { ...bed, anchor: [520, 720] as Point };
    expect(resolveVariant({ ...base, labels: [t1, newBed] }, o).labels).toEqual(
      [{ ...t1, anchor: [1, 2] }, newBed],
    );
  });

  it('round-trip through the JSON', () => {
    const status: StatusPicture = {
      source: 'mk4s_mmu3.svg',
      viewBox: '0 0 1000 1000',
      style,
      labels: [t1],
      conditional: [],
      edits: emptyEdits(),
      base: 'mk4s',
      overrides: { labels: { bed: null, T1: { ...t1, end: [300, 200] } } },
    };
    const back = parseStatus(serializeStatus(status));
    expect(back.base).toBe('mk4s');
    expect(back.overrides).toEqual({
      labels: { T1: normalizeLabel({ ...t1, end: [300, 200] }), bed: null },
    });
    const plain: StatusPicture = { ...status };
    delete plain.base;
    delete plain.overrides;
    expect(parseStatus(serializeStatus(plain)).base).toBeUndefined();
  });
});

describe('bed area', () => {
  const plain: StatusPicture = {
    source: 'mk4s.svg',
    viewBox: '0 0 1000 1000',
    style: { value: 60, caption: 30, stroke: 4 },
    labels: [],
    conditional: [],
    edits: emptyEdits(),
  };
  const bed = { x: 200, y: 700, width: 600, height: 24, rx: 4 };

  it('round-trips, after the labels', () => {
    const text = serializeStatus({ ...plain, bed });
    expect(Object.keys(JSON.parse(text) as Record<string, unknown>)).toEqual([
      'source',
      'viewBox',
      'style',
      'labels',
      'bed',
      'conditional',
      'edits',
    ]);
    expect(parseStatus(text).bed).toEqual(bed);
  });

  it('is optional: older files stay valid and unchanged', () => {
    const text = serializeStatus(plain);
    expect(text).not.toContain('"bed"');
    expect(parseStatus(text)).not.toHaveProperty('bed');
  });

  it('rejects a broken bed', () => {
    expect(() => parseStatus('{"bed":{"x":1,"y":2,"width":"3"}}')).toThrow();
  });

  it('rounds, keeps a size and drops a zero radius', () => {
    expect(
      normalizeBed({ x: 1.234, y: 2, width: 0, height: 10, rx: 0 }),
    ).toEqual({ x: 1.2, y: 2, width: 0.1, height: 10 });
    expect(normalizeBed({ x: 0, y: 0, width: 10, height: 4, rx: 9 }).rx).toBe(
      2,
    );
  });

  it('is drawn, moved and resized by dragging', () => {
    expect(dragBed(undefined, 'draw', [300, 720], [100, 700])).toEqual({
      x: 100,
      y: 700,
      width: 200,
      height: 20,
    });
    expect(dragBed(bed, 'move', [0, 0], [10, -5])).toEqual({
      ...bed,
      x: 210,
      y: 695,
    });
    expect(dragBed(bed, 'se', [800, 724], [820, 734])).toEqual({
      ...bed,
      width: 620,
      height: 34,
    });
    expect(dragBed(bed, 'w', [200, 712], [900, 712])).toEqual({
      ...bed,
      x: 800,
      width: 100,
    });
  });

  it('is inherited by a variant until it draws its own or drops it', () => {
    const base = { labels: [], style: plain.style, bed };
    expect(diffVariant(base, [], plain.style, { bed: bed })).toEqual({
      labels: {},
    });
    expect(resolveVariant(base, { labels: {} }).bed).toEqual(bed);
    const own = { ...bed, y: 650 };
    const moved = diffVariant(base, [], plain.style, { bed: own });
    expect(moved.bed).toEqual(own);
    expect(resolveVariant(base, moved).bed).toEqual(own);
    const dropped = diffVariant(base, [], plain.style);
    expect(dropped.bed).toBeNull();
    expect(resolveVariant(base, dropped)).not.toHaveProperty('bed');

    const variant: StatusPicture = {
      ...plain,
      base: 'mk4s',
      overrides: dropped,
    };
    expect(parseStatus(serializeStatus(variant)).overrides?.bed).toBeNull();
    expect(
      parseStatus(serializeStatus({ ...variant, overrides: moved })).overrides
        ?.bed,
    ).toEqual(own);
  });
});

describe('bed parts', () => {
  const plain: StatusPicture = {
    source: 'coreone.svg',
    viewBox: '0 0 1000 1000',
    style: { value: 60, caption: 30, stroke: 4 },
    labels: [],
    conditional: [],
    edits: emptyEdits(),
  };
  const parts = { parts: ['0.47', '0.46'] };

  it('round-trip in key order, each once, in place of a rectangle', () => {
    const text = serializeStatus({
      ...plain,
      bed: { parts: ['0.47', '0.46', '0.47'] },
    });
    expect((JSON.parse(text) as { bed: unknown }).bed).toEqual({
      parts: ['0.46', '0.47'],
    });
    expect(parseStatus(text).bed).toEqual({ parts: ['0.46', '0.47'] });
    expect(normalizeBedArea({ parts: ['0.10', '0.9'] })).toEqual({
      parts: ['0.9', '0.10'],
    });
  });

  it('rejects an empty or broken list', () => {
    expect(() => parseStatus('{"bed":{"parts":[]}}')).toThrow();
    expect(() => parseStatus('{"bed":{"parts":[46]}}')).toThrow();
  });

  it('are inherited by a variant until it picks its own or drops them', () => {
    const base = { labels: [], style: plain.style, bed: parts };
    expect(
      diffVariant(base, [], plain.style, { bed: { parts: ['0.46', '0.47'] } }),
    ).toEqual({
      labels: {},
    });
    expect(resolveVariant(base, { labels: {} }).bed).toEqual(parts);
    const own = { parts: ['0.50'] };
    const changed = diffVariant(base, [], plain.style, { bed: own });
    expect(changed.bed).toEqual(own);
    const rect = { x: 1, y: 2, width: 3, height: 4 };
    expect(diffVariant(base, [], plain.style, { bed: rect }).bed).toEqual(rect);
    expect(diffVariant(base, [], plain.style).bed).toBeNull();
    const variant: StatusPicture = {
      ...plain,
      base: 'coreone',
      overrides: changed,
    };
    expect(parseStatus(serializeStatus(variant)).overrides?.bed).toEqual(own);
  });
});

describe('chamber, status and fans', () => {
  const plain: StatusPicture = {
    source: 'coreone.svg',
    viewBox: '0 0 1000 1000',
    style: { value: 60, caption: 30, stroke: 4 },
    labels: [],
    conditional: [],
    edits: emptyEdits(),
  };
  const fan = {
    parts: ['141.1', '141.0'],
    kind: 'hotend' as const,
    center: [420.04, 273] as Point,
  };

  it('round-trip after the bed, in their own forms', () => {
    const text = serializeStatus({
      ...plain,
      bed: { parts: ['46'] },
      chamber: { x: 100, y: 100, width: 800, height: 600 },
      status: { parts: ['60', '59'] },
      fans: [fan, { parts: ['7'], kind: 'print', tool: 2 }],
    });
    const json = JSON.parse(text) as Record<string, unknown>;
    expect(Object.keys(json).slice(4, 8)).toEqual([
      'bed',
      'chamber',
      'status',
      'fans',
    ]);
    expect(json.fans).toEqual([
      { parts: ['141.0', '141.1'], kind: 'hotend', center: [420, 273] },
      { parts: ['7'], kind: 'print', tool: 2 },
    ]);
    const back = parseStatus(text);
    expect(back.status).toEqual({ parts: ['59', '60'] });
    expect(back.chamber).toEqual({ x: 100, y: 100, width: 800, height: 600 });
    expect(back.fans?.[1]).toEqual({ parts: ['7'], kind: 'print', tool: 2 });
  });

  it('rejects a fan of no kind or no parts', () => {
    expect(() =>
      parseStatus('{"fans":[{"parts":["1"],"kind":"x"}]}'),
    ).toThrow();
    expect(() =>
      parseStatus('{"fans":[{"parts":[],"kind":"print"}]}'),
    ).toThrow();
  });

  it('are inherited by a variant, each area on its own, the fans as a list', () => {
    const base = {
      labels: [],
      style: plain.style,
      status: { parts: ['60'] },
      fans: [fan],
    };
    expect(diffVariant(base, [], plain.style, base)).toEqual({ labels: {} });
    const own = diffVariant(base, [], plain.style, {
      status: { parts: ['61'] },
      chamber: { x: 1, y: 2, width: 3, height: 4 },
    });
    expect(own).toEqual({
      labels: {},
      status: { parts: ['61'] },
      chamber: { x: 1, y: 2, width: 3, height: 4 },
      fans: [],
    });
    expect(resolveVariant(base, own)).not.toHaveProperty('fans');
    expect(resolveVariant(base, { labels: {} }).fans).toEqual([fan]);
    const variant: StatusPicture = {
      ...plain,
      base: 'coreone',
      overrides: own,
    };
    expect(parseStatus(serializeStatus(variant)).overrides).toEqual(own);
  });
});

describe('label shadow', () => {
  it('is saved in the style only when on, and a variant can turn it on', () => {
    const plain: StatusPicture = {
      source: 'coreone.svg',
      viewBox: '0 0 1000 1000',
      style: { value: 60, caption: 30, stroke: 4 },
      labels: [],
      conditional: [],
      edits: emptyEdits(),
    };
    expect(serializeStatus(plain)).not.toContain('shadow');
    const on = { ...plain.style, shadow: true as const };
    expect(parseStatus(serializeStatus({ ...plain, style: on })).style).toEqual(
      on,
    );
    const overrides = diffVariant(plain, [], on);
    expect(overrides.style).toEqual(on);
    expect(
      parseStatus(serializeStatus({ ...plain, base: 'coreone', overrides }))
        .overrides?.style,
    ).toEqual(on);
    expect(resolveVariant(plain, { labels: {} }).style).toEqual(plain.style);
  });
});

describe('carriage', () => {
  it('round-trips its parts and positions, dropping zero offsets', () => {
    const plain: StatusPicture = {
      source: 'xl.svg',
      viewBox: '0 0 1000 1000',
      style: { value: 60, caption: 30, stroke: 4 },
      labels: [],
      conditional: [],
      edits: emptyEdits(),
    };
    const text = serializeStatus({
      ...plain,
      carriage: {
        parts: ['0.12', '0.3'],
        positions: { '3': [192.64, 0], '0': [0, 0], '2': [103.2, 0] },
      },
    });
    expect((JSON.parse(text) as { carriage: unknown }).carriage).toEqual({
      parts: ['0.3', '0.12'],
      positions: { '2': [103.2, 0], '3': [192.6, 0] },
    });
    expect(parseStatus(text).carriage?.positions['3']).toEqual([192.6, 0]);
  });
});
