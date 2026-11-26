/// Drops custom properties that no `var()` in the page reads, with their
/// `@property` rules. The tokens copy carries every step of every colour scale
/// and every semantic token of the design system; PrusaLink reads a fraction,
/// and the firmware budget pays for each byte. Repeats until nothing changes,
/// since a dropped token may have been the only reader of another. Runs on the
/// finished single-file page (scripts/build-all.ts).
export function pruneCssVars(html: string): string {
  for (;;) {
    const read = new Set(
      [...html.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]),
    );
    const next = html
      .replace(/@property\s+(--[\w-]+)\s*\{[^}]*\}/g, (rule, name: string) =>
        read.has(name) ? rule : '',
      )
      .replace(
        /([{;\s])(--[\w-]+):[^;{}]*;?/g,
        (decl, lead: string, name: string) => (read.has(name) ? decl : lead),
      );
    if (next === html) return html;
    html = next;
  }
}

/// Writes the value of every custom property set once, in a :root or :host
/// rule, into the var() that read it, and drops the property. The design
/// tokens chain three deep (utility → Tailwind theme → semantic token →
/// palette step); only properties the dark theme or an element sets again
/// stay variables. Tailwind's own --tw-* properties are left alone: utilities
/// set them per element. Run before pruneCssVars.
export function flattenCssVars(html: string): string {
  const defs = new Map<string, string[]>();
  for (const m of html.matchAll(/([{;\s])(--[\w-]+):([^;{}]*)/g)) {
    const name = m[2] ?? '';
    defs.set(name, [...(defs.get(name) ?? []), (m[3] ?? '').trim()]);
  }
  const rootOnly = new Set<string>();
  for (const m of html.matchAll(/(?:^|})\s*((?::root|:host)[^{]*)\{([^}]*)\}/g))
    for (const d of (m[2] ?? '').matchAll(/(--[\w-]+):/g))
      rootOnly.add(d[1] ?? '');
  const inline = new Map<string, string>();
  for (const [name, values] of defs)
    if (
      values.length === 1 &&
      rootOnly.has(name) &&
      !name.startsWith('--tw-') &&
      !(values[0] ?? '').includes('var(--tw-')
    )
      inline.set(name, values[0] ?? '');
  const resolve = (value: string, depth = 0): string =>
    depth > 8
      ? value
      : value.replace(/var\((--[\w-]+)\)/g, (ref, name: string) => {
          const v = inline.get(name);
          return v === undefined ? ref : resolve(v, depth + 1);
        });
  let out = html.replace(/var\((--[\w-]+)\)/g, (ref, name: string) => {
    const v = inline.get(name);
    return v === undefined ? ref : resolve(v);
  });
  out = out.replace(
    /([{;\s])(--[\w-]+):([^;{}]*);?/g,
    (decl, lead: string, name: string) => (inline.has(name) ? lead : decl),
  );
  return out;
}
