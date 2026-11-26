import { apply, type Matrix, type Point } from './geometry.ts';
import { keyOf } from './structure.ts';

export interface TreeNode {
  key: string;
  depth: number;
  tag: string;
  /// The name the drawing tool gave it, if any.
  name: string | undefined;
  label: string;
  fill: string | undefined;
  children: TreeNode[];
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/// Elements that are never drawn themselves, only referenced.
const NOT_DRAWN = new Set([
  'defs',
  'clipPath',
  'mask',
  'linearGradient',
  'radialGradient',
  'pattern',
  'symbol',
  'filter',
  'style',
  'title',
  'desc',
  'metadata',
  'stop',
  'sodipodi:namedview',
]);

const SHAPES = new Set([
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'image',
  'use',
]);

export function isDrawn(el: Element, root: Element): boolean {
  for (let at: Element | null = el; at && at !== root; at = at.parentElement)
    if (NOT_DRAWN.has(at.tagName)) return false;
  return true;
}

export function isShape(el: Element): boolean {
  return SHAPES.has(el.tagName);
}

/// `el`'s bounding box in the root's user space, or undefined when it is not
/// drawn (hidden, or a definition).
export function boxOf(el: Element, svg: SVGSVGElement): Box | undefined {
  if (!(el instanceof SVGGraphicsElement)) return undefined;
  const screen = svg.getScreenCTM();
  const own = el.getScreenCTM();
  if (!screen || !own) return undefined;
  const b = el.getBBox();
  if (!b.width && !b.height) return undefined;
  const m = screen.inverse().multiply(own);
  const matrix: Matrix = [m.a, m.b, m.c, m.d, m.e, m.f];
  const corners: Point[] = [
    apply(matrix, [b.x, b.y]),
    apply(matrix, [b.x + b.width, b.y]),
    apply(matrix, [b.x, b.y + b.height]),
    apply(matrix, [b.x + b.width, b.y + b.height]),
  ];
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function buildTree(
  parent: Element,
  svg: SVGSVGElement,
  depth = 0,
): TreeNode[] {
  return [...parent.children].flatMap((el) => {
    const key = keyOf(el);
    if (!key) return [];
    return [
      {
        key,
        depth,
        tag: el.tagName,
        name: nameOf(el),
        label: describe(el, svg),
        fill: el.getAttribute('fill') ?? undefined,
        children: buildTree(el, svg, depth + 1),
      },
    ];
  });
}

/// Inkscape's label, Illustrator's data-name or a `<title>` child.
export function nameOf(el: Element): string | undefined {
  const title = [...el.children]
    .find((c) => c.tagName === 'title')
    ?.textContent.trim();
  return (
    el.getAttribute('inkscape:label') ??
    el.getAttribute('data-name') ??
    (title === '' ? undefined : title)
  );
}

function describe(el: Element, svg: SVGSVGElement): string {
  const parts: string[] = [];
  const id = el.getAttribute('id');
  const cls = el.getAttribute('class');
  if (id) parts.push(`#${id}`);
  if (cls) parts.push(`.${cls.split(/\s+/).join('.')}`);
  if (el.tagName === 'text')
    parts.push(`“${el.textContent.trim().slice(0, 20)}”`);
  if (el.children.length) parts.push(`${String(el.children.length)} children`);
  const box = boxOf(el, svg);
  if (box)
    parts.push(
      `${String(Math.round(box.width))}×${String(Math.round(box.height))} at ${String(Math.round(box.x))},${String(Math.round(box.y))}`,
    );
  return parts.join(' ');
}

/// What a click on `leaf` selects: the largest group around it that is
/// still a part rather than the whole picture, or the leaf itself.
export function partOf(
  leaf: Element,
  root: Element,
  svg: SVGSVGElement,
  maxArea: number,
): Element {
  const chain: Element[] = [];
  for (let at: Element | null = leaf; at && at !== root; at = at.parentElement)
    chain.unshift(at);
  for (const el of chain) {
    const box = boxOf(el, svg);
    if (box && box.width * box.height < maxArea) return el;
  }
  return leaf;
}

/// The shapes fully inside `box`, with each group whose drawn shapes are all
/// inside standing in for them.
export function elementsIn(
  box: Box,
  root: Element,
  svg: SVGSVGElement,
): Element[] {
  const inside = (b: Box) =>
    b.x >= box.x &&
    b.y >= box.y &&
    b.x + b.width <= box.x + box.width &&
    b.y + b.height <= box.y + box.height;
  const drawnShapes = (el: Element) =>
    [...el.querySelectorAll('*')].filter(
      (e) => isShape(e) && isDrawn(e, root) && boxOf(e, svg),
    );
  const picked = new Set(
    drawnShapes(root).filter((el) => {
      const b = boxOf(el, svg);
      return b && inside(b);
    }),
  );
  const out = new Set<Element>();
  for (const el of picked) {
    let top = el;
    for (
      let parent = el.parentElement;
      parent &&
      parent !== root &&
      drawnShapes(parent).every((e) => picked.has(e));
      parent = parent.parentElement
    )
      top = parent;
    out.add(top);
  }
  return [...out];
}
