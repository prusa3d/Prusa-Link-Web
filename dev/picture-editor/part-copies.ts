import { KEY } from './structure.ts';

const INHERITED = ['stroke', 'stroke-width', 'stroke-linejoin', 'fill-rule'];
const DROPPED = ['id', 'class', 'style', 'transform', KEY];

/// Draws copies of `parts` into `into`, where the app draws them: over the
/// picture, outlined as they were unless not `outlined` and, with `filled`,
/// in their own fill (else in the fill `into` gives them). `into` and the
/// parts may sit in different <svg>s that show the same canvas.
export function copyParts(
  into: SVGGElement,
  parts: Element[],
  filled: boolean,
  outlined = true,
) {
  into.replaceChildren();
  // From the parent: `into` itself may be turning.
  const to = (into.parentNode as SVGGraphicsElement | null)
    ?.getScreenCTM()
    ?.inverse();
  if (!to) return;
  for (const el of parts) {
    if (!(el instanceof SVGGraphicsElement)) continue;
    // Parts whose condition fails for the previewed equipment, as the app
    // leaves out their copies.
    if (el.closest('[display="none"]')) continue;
    const at = el.getScreenCTM();
    if (!at) continue;
    const m = to.multiply(at);
    const look = getComputedStyle(el);
    const copy = el.cloneNode(true) as SVGGraphicsElement;
    for (const e of [copy, ...copy.querySelectorAll('*')]) {
      for (const a of [...e.attributes])
        if (DROPPED.includes(a.name) || /^data-.*-part$/.test(a.name))
          e.removeAttribute(a.name);
    }
    for (const p of INHERITED) copy.setAttribute(p, look.getPropertyValue(p));
    if (!outlined) copy.setAttribute('stroke', 'none');
    if (filled) copy.setAttribute('fill', look.fill);
    else copy.removeAttribute('fill');
    copy.setAttribute(
      'transform',
      `matrix(${[m.a, m.b, m.c, m.d, m.e, m.f].join(' ')})`,
    );
    into.append(copy);
  }
}

/// A Svelte action: `node` holds copies of the parts `find` returns, redrawn
/// whenever the parameters change.
export function partCopies(
  node: SVGGElement,
  params: {
    find: () => Element[];
    filled?: boolean;
    outlined?: boolean;
    version?: unknown;
  },
) {
  const draw = (p: typeof params) => {
    copyParts(node, p.find(), p.filled ?? false, p.outlined);
  };
  draw(params);
  return { update: draw };
}
