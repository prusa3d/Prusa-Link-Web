import { describe, expect, it } from 'vitest';

import {
  comparePaths,
  defaultStyle,
  flipLabel,
  heatersFor,
  labelLayout,
  labelLength,
  newLabel,
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
