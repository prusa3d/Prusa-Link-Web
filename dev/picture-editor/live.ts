import { type Affine, type ViewBox } from './geometry.ts';
import { applyTransforms, viewBoxOf } from './status.ts';
import {
  applyStructure,
  findKey,
  type StructureOp,
  tagKeys,
} from './structure.ts';

/// The original picture drawn inside the editor's `<g>`, whose children stand
/// for the original root's, with the structure edits replayed on it.
export class LivePicture {
  private base = new Map<Element, string | null>();
  private strokes = new Map<Element, string | null>();
  private touched = new Set<string>();
  /// The structure edits drawn, as JSON.
  structureKey = '';

  constructor(
    private content: SVGGElement,
    private source: string,
  ) {}

  /// Rebuilds the picture when `ops` differ from what is drawn.
  mount(ops: readonly StructureOp[]): ViewBox {
    const original = new DOMParser().parseFromString(
      this.source,
      'image/svg+xml',
    ).documentElement;
    const viewBox = viewBoxOf(original);
    const key = JSON.stringify(ops);
    if (key === this.structureKey) return viewBox;
    tagKeys(original);
    const content = this.content;
    content.replaceChildren();
    for (const attr of [...content.attributes])
      content.removeAttribute(attr.name);
    for (const attr of original.attributes)
      if (
        !['width', 'height', 'viewBox'].includes(attr.name) &&
        !attr.name.startsWith('xmlns')
      )
        content.setAttribute(attr.name, attr.value);
    for (const child of original.children)
      content.append(document.importNode(child, true));
    applyStructure(content, ops);
    this.base.clear();
    this.strokes.clear();
    for (const el of content.querySelectorAll('*')) {
      this.base.set(el, el.getAttribute('transform'));
      this.strokes.set(el, el.getAttribute('stroke-width'));
    }
    this.touched.clear();
    this.structureKey = key;
    return viewBox;
  }

  /// Shows `hidden` as display:none and applies `transforms`, undoing what an
  /// earlier call did to elements no longer listed.
  sync(
    hidden: readonly string[],
    transforms: Readonly<Record<string, Affine>>,
  ) {
    const hide = new Set(hidden);
    const keys = new Set([
      ...this.touched,
      ...hidden,
      ...Object.keys(transforms),
    ]);
    for (const k of keys) {
      const el = findKey(this.content, k);
      if (el instanceof SVGElement)
        el.style.display = hide.has(k) ? 'none' : '';
    }
    applyTransforms(
      this.content,
      transforms,
      (el) => this.base.get(el) ?? null,
      (el) => this.strokes.get(el) ?? null,
      keys,
    );
    this.touched = keys;
  }
}
