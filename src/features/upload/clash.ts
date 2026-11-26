import type { PickedFile } from '../../lib/files/collect';

/// What to do with files whose names the folder already has.
export type Clash = 'replace' | 'keep' | 'skip';

/// `name-2.ext`, `name-3.ext`, … : the first one not in `taken`.
export function freeName(name: string, taken: ReadonlySet<string>): string {
  const dot = name.lastIndexOf('.');
  const [base, ext] =
    dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
  for (let n = 2; ; n++) {
    const candidate = `${base}-${String(n)}${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/// The batch to upload after the person's choice: skipping drops the clashing
/// files, keeping both renames them; replacing leaves the batch as it is.
export function settleClashes(
  picked: PickedFile[],
  existing: readonly string[],
  choice: Clash,
): PickedFile[] {
  const clashes = (p: PickedFile) => existing.includes(p.file.name);
  if (choice === 'skip') return picked.filter((p) => !clashes(p));
  if (choice === 'replace') return picked;
  const taken = new Set([...existing, ...picked.map((p) => p.file.name)]);
  return picked.map((p) => {
    if (!clashes(p)) return p;
    const name = freeName(p.file.name, taken);
    taken.add(name);
    return { ...p, file: new File([p.file], name) };
  });
}
