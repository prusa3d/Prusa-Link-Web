import printerImages from 'virtual:printer-images';

import type { Variant } from './models';
import {
  type Equipment,
  hideIds,
  met,
  type PictureStatus,
} from './status-picture';

const REMEMBERED = 'prusalink.printer';

/// What the page knows the printer has. Firmware before PrusaLink 2
/// reports the MMU only: one tool, no enclosure and no chamber.
export function equipmentOf(
  mmu: boolean,
  more: Partial<Omit<Equipment, 'mmu'>> = {},
): Equipment {
  return { mmu, enclosure: false, chamber: false, tools: 1, ...more };
}

export interface Picture {
  url: string;
  /// The labels drawn over it, on its 500-unit canvas.
  status?: PictureStatus;
}

/// The printer's picture. A printer's own build carries only its picture and
/// the generic build the CORE One's, which stands for every printer; either
/// shows even before the model is known (on the sign-in page). The dev
/// server carries all of them and picks by model. Parts the printer does not
/// have are hidden.
export function pictureFor(
  variant: Variant | undefined,
  mmu = false,
  equipment = equipmentOf(mmu),
): Picture | undefined {
  const all = Object.entries(printerImages.images);
  const [only] = all;
  // Unknown yet (first visit, before the printer answers): the CORE One, the
  // generic build's picture, so the card never starts empty.
  const key = (
    all.length === 1 && only ? only[0] : (variant ?? 'coreone')
  ) as Variant;
  const picture =
    (mmu ? printerImages.mmu[key] : undefined) ?? printerImages.images[key];
  if (!picture) return undefined;
  const hidden = (picture.status?.conditional ?? [])
    .filter((c) => !met(c.when, equipment))
    .map((c) => c.id);
  return {
    url: url(hideIds(picture.svg, hidden)),
    ...(picture.status && { status: picture.status }),
  };
}

// The build carries the SVG markup as text (a data URL would percent-encode
// every < and >); it becomes an image URL here, once.
const urls = new Map<string, string>();
function url(svg: string): string {
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
