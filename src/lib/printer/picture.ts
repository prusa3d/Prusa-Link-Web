import printerImages from 'virtual:printer-images';

import type { Variant } from './models';

const REMEMBERED = 'prusalink.printer';

/// The printer's picture. A printer's own build carries only its picture and
/// the generic build the CORE One's, which stands for every printer; either
/// shows even before the model is known (on the sign-in page). The dev
/// server carries all of them and picks by model.
export function pictureFor(
  variant: Variant | undefined,
  mmu = false,
): string | undefined {
  const all = Object.entries(printerImages.images);
  const [only] = all;
  const key = all.length === 1 && only ? only[0] : variant;
  if (!key) return undefined;
  return url(
    (mmu ? printerImages.mmu[key as Variant] : undefined) ??
      printerImages.images[key as Variant],
  );
}

// The build carries the SVG markup as text (a data URL would percent-encode
// every < and >); it becomes an image URL here, once.
const urls = new Map<string, string>();
function url(svg: string | undefined): string | undefined {
  if (!svg) return undefined;
  let u = urls.get(svg);
  if (!u) {
    u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    urls.set(svg, u);
  }
  return u;
}

/// The model this browser last saw here, for the sign-in page, which cannot
/// ask the printer before it has the password.
export function rememberedVariant(): Variant | undefined {
  try {
    return (
      (globalThis.localStorage.getItem(REMEMBERED) as Variant | null) ??
      undefined
    );
  } catch {
    return undefined;
  }
}

export function rememberVariant(variant: Variant) {
  try {
    globalThis.localStorage.setItem(REMEMBERED, variant);
  } catch {
    // Not remembered.
  }
}
