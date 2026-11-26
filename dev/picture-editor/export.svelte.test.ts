import { describe, expect, it } from 'vitest';

import { apply, parseTransform } from './geometry.ts';
import { type Edits, exportSvg } from './status.ts';
import {
  applyStructure,
  findKey,
  importMarkup,
  KEY,
  outermost,
  tagKeys,
  uniqueId,
} from './structure.ts';

const SOURCE = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" fill="none">
  <defs><linearGradient id="g"><stop stop-color="#fff"/></linearGradient></defs>
  <rect id="body" x="0" y="0" width="10" height="10"/>
  <g id="door" transform="scale(2)">
    <path id="glass" d="M0 0h5v5z" stroke="#000" stroke-width="2"/>
    <path id="handle" d="M1 1h1v1z" transform="translate(4 0)"/>
  </g>
  <circle id="knob" cx="50" cy="50" r="5"/>
</svg>`;

const NONE: Edits = {
  hidden: [],
  transforms: {},
  structure: [],
  conditions: {},
};

function parse(svg: string) {
  return new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
}

function keyed() {
  const root = parse(SOURCE);
  tagKeys(root);
  return root;
}

const ids = (el: Element | null | undefined) =>
  [...(el?.children ?? [])].map((c) => c.id);

describe('keys', () => {
  it('name elements by their original path', () => {
    const root = keyed();
    expect(findKey(root, '2.1')?.id).toBe('handle');
    expect(findKey(root, '9')).toBeUndefined();
  });

  it('pick the outermost of nested keys in document order', () => {
    const root = keyed();
    expect(outermost(root, ['3', '2.1', '2']).map((e) => e.id)).toEqual([
      'door',
      'knob',
    ]);
  });
});

describe('structure edits', () => {
  it('group, rename, move out and back, and ungroup', () => {
    const root = keyed();
    applyStructure(root, [
      { op: 'group', id: 'front', name: 'Front', members: ['3', '1'] },
    ]);
    expect(ids(root)).toEqual(['', 'front', 'door']);
    expect(ids(root.querySelector('#front'))).toEqual(['body', 'knob']);
    expect(root.querySelector('#front')?.getAttribute('inkscape:label')).toBe(
      'Front',
    );
    applyStructure(root, [
      { op: 'rename', key: 'g:front', name: 'Face' },
      { op: 'move', keys: ['3'], into: null },
    ]);
    expect(root.querySelector('#front')?.getAttribute('inkscape:label')).toBe(
      'Face',
    );
    expect(ids(root)).toEqual(['', 'front', 'knob', 'door']);
    applyStructure(root, [{ op: 'move', keys: ['3'], into: 'g:front' }]);
    expect(ids(root.querySelector('#front'))).toEqual(['body', 'knob']);
    applyStructure(root, [{ op: 'ungroup', key: 'g:front' }]);
    expect(ids(root)).toEqual(['', 'body', 'knob', 'door']);
  });

  it('keeps a group transform on its children when ungrouping', () => {
    const root = keyed();
    applyStructure(root, [{ op: 'ungroup', key: '2' }]);
    expect(root.querySelector('#handle')?.getAttribute('transform')).toBe(
      'scale(2) translate(4 0)',
    );
  });

  it('makes unique ids', () => {
    const root = keyed();
    expect(uniqueId(root, 'Door')).toBe('door-2');
    expect(uniqueId(root, 'Print head')).toBe('print-head');
    expect(uniqueId(root, '3D')).toBe('g-3d');
  });
});

describe('exportSvg', () => {
  it('removes hidden parts and adds a viewBox', () => {
    const out = parse(exportSvg(SOURCE, { ...NONE, hidden: ['2'] }));
    expect(out.querySelector('#door')).toBeNull();
    expect(out.querySelector('#glass')).toBeNull();
    expect(out.querySelector('#body')).not.toBeNull();
    expect(out.getAttribute('viewBox')).toBe('0 0 200 100');
    expect(out.getAttribute('fill')).toBe('none');
    expect(out.querySelector(`[${KEY}]`)).toBeNull();
  });

  it('bakes root-space moves inside scaled groups', () => {
    const out = parse(
      exportSvg(SOURCE, { ...NONE, transforms: { '2.1': [1, 1, 10, 4] } }),
    );
    const handle = out.querySelector('#handle');
    expect(handle?.getAttribute('transform')).toBe(
      'translate(5 2) translate(4 0)',
    );
    const parent = parseTransform(
      out.querySelector('#door')?.getAttribute('transform'),
    );
    const at = apply(
      parent,
      apply(parseTransform(handle?.getAttribute('transform')), [0, 0]),
    );
    expect(at).toEqual([18, 4]);
  });

  it('scales and keeps stroke widths', () => {
    const out = parse(
      exportSvg(SOURCE, { ...NONE, transforms: { '2.0': [4, 1, -10, 0] } }),
    );
    const glass = out.querySelector('#glass');
    expect(glass?.getAttribute('transform')).toBe('matrix(4 0 0 1 -5 0)');
    expect(glass?.getAttribute('stroke-width')).toBe('1');
  });

  it('replays groups before transforms, so a group can be moved', () => {
    const out = parse(
      exportSvg(SOURCE, {
        hidden: [],
        structure: [
          { op: 'group', id: 'front', name: 'Front', members: ['1', '3'] },
        ],
        transforms: { 'g:front': [1, 1, 0, -5] },
        conditions: {},
      }),
    );
    const front = out.querySelector('#front');
    expect(front?.getAttribute('transform')).toBe('translate(0 -5)');
    expect(front?.getAttribute('inkscape:label')).toBe('Front');
    expect(ids(front)).toEqual(['body', 'knob']);
  });

  it('gives conditional parts an id', () => {
    const out = parse(
      exportSvg(SOURCE, {
        ...NONE,
        conditions: { '3': 'mmu', '2': 'chamber' },
      }),
    );
    expect(out.querySelector('circle')?.id).toBe('knob');
    expect(out.querySelector('#door')).not.toBeNull();
    const bare = parse(
      exportSvg(SOURCE.replace(' id="knob"', ''), {
        ...NONE,
        conditions: { '3': 'mmu' },
      }),
    );
    expect(bare.querySelector('circle')?.id).toBe('part-3');
  });

  it('imports artwork as a group with scoped ids', () => {
    const markup = importMarkup(
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="g"/></defs><rect id="box" fill="url(#g)" width="4" height="4"/></svg>',
      'mmu3',
    );
    expect(markup).toContain('id="mmu3-box"');
    expect(markup).toContain('url(#mmu3-g)');
    const out = parse(
      exportSvg(SOURCE, {
        ...NONE,
        structure: [
          { op: 'import', id: 'mmu3', name: 'MMU3', markup: markup ?? '' },
        ],
        transforms: { 'g:mmu3.1': [1, 1, 5, 0] },
      }),
    );
    const g = out.querySelector('#mmu3');
    expect(g?.getAttribute('inkscape:label')).toBe('MMU3');
    expect(ids(g)).toEqual(['', 'mmu3-box']);
    expect(out.querySelector('#mmu3-box')?.getAttribute('transform')).toBe(
      'translate(5 0)',
    );
    expect(out.lastElementChild?.id).toBe('mmu3');
    expect(importMarkup('<path d="M0 0h1"/>', 'x')).toContain('<path');
    expect(importMarkup('not svg', 'x')).toBeUndefined();
  });
});
