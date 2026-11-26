/// Every element is known by a key that survives regrouping: its child-index
/// path in the original picture ("0.12"), or "g:<id>" for a group made in the
/// editor. Keys live in this attribute while the editor works on a DOM and
/// are stripped from the saved SVG.
export const KEY = 'data-pe-key';

const SVG_NS = 'http://www.w3.org/2000/svg';
const INKSCAPE_NS = 'http://www.inkscape.org/namespaces/inkscape';

/// Structure edits, replayed in order on the original picture.
export type StructureOp =
  | { op: 'group'; id: string; name: string; members: string[] }
  | { op: 'ungroup'; key: string }
  | { op: 'rename'; key: string; name: string }
  | { op: 'move'; keys: string[]; into: string | null }
  /// Artwork brought in as a new group on top of the picture; `markup` is
  /// the SVG content, ids already scoped to the group.
  | { op: 'import'; id: string; name: string; markup: string };

export function groupKey(id: string): string {
  return `g:${id}`;
}

/// Keys every element under `root` by its child-index path.
export function tagKeys(root: Element, prefix = '') {
  [...root.children].forEach((el, i) => {
    const key = `${prefix}${String(i)}`;
    el.setAttribute(KEY, key);
    tagKeys(el, `${key}.`);
  });
}

export function stripKeys(root: Element) {
  for (const el of root.querySelectorAll(`[${KEY}]`)) el.removeAttribute(KEY);
}

export function keyOf(el: Element): string | undefined {
  return el.getAttribute(KEY) ?? undefined;
}

export function findKey(root: Element, key: string): Element | undefined {
  return (
    root.querySelector(`[${KEY}="${key.replace(/["\\]/g, '\\$&')}"]`) ??
    undefined
  );
}

/// The keyed ancestors of `el`, nearest first, below `root`.
export function ancestorKeys(el: Element, root: Element): string[] {
  const out: string[] = [];
  for (let at = el.parentElement; at && at !== root; at = at.parentElement) {
    const k = keyOf(at);
    if (k) out.push(k);
  }
  return out;
}

/// The elements for `keys` in document order, leaving out any inside another
/// one of them.
export function outermost(root: Element, keys: readonly string[]): Element[] {
  const els = keys
    .map((k) => findKey(root, k))
    .filter((el) => el !== undefined);
  return els
    .filter((el) => !els.some((o) => o !== el && o.contains(el)))
    .sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );
}

/// An id from a name, unique among the ids in `root`'s document.
export function uniqueId(root: Element, name: string): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'group';
  const base = /^[a-z]/.test(slug) ? slug : `g-${slug}`;
  const taken = new Set(
    [...root.ownerDocument.querySelectorAll('[id]')].map((el) => el.id),
  );
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${String(n)}`;
  return id;
}

export function setName(el: Element, name: string) {
  el.setAttributeNS(INKSCAPE_NS, 'inkscape:label', name);
}

/// The top-level element (a child of `root`) that holds `el`.
function topLevel(el: Element, root: Element): Element {
  let at = el;
  while (at.parentElement && at.parentElement !== root) at = at.parentElement;
  return at;
}

function newGroup(root: Element, id: string, name: string): Element {
  const g = root.ownerDocument.createElementNS(SVG_NS, 'g');
  g.setAttribute('id', id);
  setName(g, name);
  g.setAttribute(KEY, groupKey(id));
  return g;
}

/// The markup an import op stores: the drawn content of an SVG document or
/// fragment, with its ids prefixed by `id`.
export function importMarkup(text: string, id: string): string | undefined {
  const trimmed = text.trim();
  const source = /^<(\?xml|svg\b)/.test(trimmed)
    ? trimmed
    : `<svg xmlns="${SVG_NS}">${trimmed}</svg>`;
  const svg = new DOMParser().parseFromString(
    source.replace(/^<\?xml[^>]*>/, ''),
    'image/svg+xml',
  ).documentElement;
  if (svg.tagName !== 'svg' || !svg.children.length) return undefined;
  const serializer = new XMLSerializer();
  return [...svg.children]
    .map((c) => serializer.serializeToString(c))
    .join('')
    .replace(/ xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '')
    .replace(/\bid="([^"]+)"/g, `id="${id}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${id}-$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${id}-$1"`);
}

export function applyOp(root: Element, op: StructureOp) {
  switch (op.op) {
    case 'group': {
      const members = outermost(root, op.members);
      const first = members[0];
      if (!first?.parentElement || findKey(root, groupKey(op.id))) return;
      const g = newGroup(root, op.id, op.name);
      first.parentElement.insertBefore(g, first);
      g.append(...members);
      return;
    }
    case 'ungroup': {
      const g = findKey(root, op.key);
      if (!g?.parentElement || g.tagName !== 'g' || g === root) return;
      const own = g.getAttribute('transform');
      if (own)
        for (const c of g.children)
          c.setAttribute(
            'transform',
            `${own} ${c.getAttribute('transform') ?? ''}`.trim(),
          );
      g.replaceWith(...g.children);
      return;
    }
    case 'rename': {
      const el = findKey(root, op.key);
      if (el) setName(el, op.name);
      return;
    }
    case 'import': {
      if (findKey(root, groupKey(op.id))) return;
      const g = newGroup(root, op.id, op.name);
      const parsed = new DOMParser().parseFromString(
        `<svg xmlns="${SVG_NS}" xmlns:inkscape="${INKSCAPE_NS}">${op.markup}</svg>`,
        'image/svg+xml',
      ).documentElement;
      if (parsed.tagName !== 'svg') return;
      for (const child of parsed.children)
        g.append(root.ownerDocument.importNode(child, true));
      tagKeys(g, `${groupKey(op.id)}.`);
      root.append(g);
      return;
    }
    case 'move': {
      const target = op.into === null ? root : findKey(root, op.into);
      if (!target) return;
      const members = outermost(root, op.keys).filter(
        (el) => el !== target && !el.contains(target),
      );
      if (op.into !== null) {
        target.append(...members);
        return;
      }
      for (const el of members.reverse()) {
        if (el.parentElement === root) continue;
        topLevel(el, root).after(el);
      }
    }
  }
}

export function applyStructure(root: Element, ops: readonly StructureOp[]) {
  for (const op of ops) applyOp(root, op);
}

export function parseStructure(value: unknown): StructureOp[] {
  if (!Array.isArray(value)) return [];
  const strings = (v: unknown) =>
    Array.isArray(v) ? v.map(String) : ([] as string[]);
  return value.flatMap((raw): StructureOp[] => {
    if (!raw || typeof raw !== 'object') return [];
    const o = raw as Record<string, unknown>;
    const s = (k: string) => (typeof o[k] === 'string' ? o[k] : '');
    switch (o.op) {
      case 'group':
        return s('id')
          ? [
              {
                op: 'group',
                id: s('id'),
                name: s('name'),
                members: strings(o.members),
              },
            ]
          : [];
      case 'ungroup':
        return [{ op: 'ungroup', key: s('key') }];
      case 'rename':
        return [{ op: 'rename', key: s('key'), name: s('name') }];
      case 'move':
        return [
          {
            op: 'move',
            keys: strings(o.keys),
            into: typeof o.into === 'string' ? o.into : null,
          },
        ];
      case 'import':
        return s('id')
          ? [
              {
                op: 'import',
                id: s('id'),
                name: s('name'),
                markup: s('markup'),
              },
            ]
          : [];
      default:
        return [];
    }
  });
}
