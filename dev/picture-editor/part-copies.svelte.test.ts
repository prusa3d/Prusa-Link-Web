import { describe, expect, it } from 'vitest';

import { copyParts } from './part-copies.ts';

const NS = 'http://www.w3.org/2000/svg';

describe('copyParts', () => {
  it('copies parts where they are drawn, outlined as they were', () => {
    document.body.innerHTML = `<svg xmlns="${NS}" viewBox="0 0 100 100" width="200" height="200">
      <g transform="translate(10 20) scale(2)" stroke="#123456">
        <rect id="a" data-bed-part="" x="1" y="2" width="3" height="4" fill="#f00"/>
      </g>
      <g id="into"></g>
    </svg>`;
    const into = document.getElementById('into') as unknown as SVGGElement;
    const part = document.getElementById('a') as Element;
    copyParts(into, [part], false);
    const copy = into.firstElementChild as SVGGraphicsElement;
    expect(copy.id).toBe('');
    expect(copy.hasAttribute('data-bed-part')).toBe(false);
    expect(copy.hasAttribute('fill')).toBe(false);
    expect(copy.getAttribute('stroke')).toBe('rgb(18, 52, 86)');
    const at = (el: Element) => {
      const r = el.getBoundingClientRect();
      return [r.x, r.y, r.width, r.height].map(Math.round);
    };
    expect(at(copy)).toEqual(at(part));

    copyParts(into, [part], true);
    expect(into.childElementCount).toBe(1);
    expect(into.firstElementChild?.getAttribute('fill')).toBe('rgb(255, 0, 0)');
  });
});
