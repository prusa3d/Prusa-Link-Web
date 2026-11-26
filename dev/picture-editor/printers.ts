export interface PrinterPicture {
  name: string;
  /// Set for a variant picture: the model picture it builds on and what it
  /// adds ("mmu3").
  base?: string;
  suffix?: string;
}

/// The pictures in assets/printers, each variant (`<model>_<suffix>`) right
/// after its model. `models` are the pictures the builds use as they are, so
/// coreone_indx is a model, not a CORE One variant.
export function listPictures(
  names: readonly string[],
  models: readonly string[],
): PrinterPicture[] {
  const variantOf = (name: string): PrinterPicture | undefined => {
    if (models.includes(name)) return undefined;
    const base = [...models]
      .sort((a, b) => b.length - a.length)
      .find((m) => name.startsWith(`${m}_`));
    return base
      ? { name, base, suffix: name.slice(base.length + 1) }
      : undefined;
  };
  const pictures = names.map((n) => variantOf(n) ?? { name: n });
  const bases = pictures
    .filter((p) => !p.base)
    .sort((a, b) => a.name.localeCompare(b.name));
  return bases.flatMap((b) => [
    b,
    ...pictures
      .filter((p) => p.base === b.name)
      .sort((x, y) => x.name.localeCompare(y.name)),
  ]);
}

/// The dropdown entry: a variant indented under its model.
export function pictureLabel(p: PrinterPicture): string {
  return p.base && p.suffix
    ? `↳ ${p.base} + ${p.suffix.toUpperCase()}`
    : p.name;
}
