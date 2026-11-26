/// Thumbnails read from files uploaded in this visit, by display name. The
/// printer often has no small thumbnail to send, and asking it for the large
/// one is slow, so the page keeps the picture it already read. Lost on
/// reload, like any page memory.
const thumbnails = new Map<string, string>();

export function rememberThumbnail(name: string, picture: Blob) {
  const old = thumbnails.get(name);
  if (old) URL.revokeObjectURL(old);
  thumbnails.set(name, URL.createObjectURL(picture));
}

export function localThumbnail(name: string | undefined): string | undefined {
  return name === undefined ? undefined : thumbnails.get(name);
}

/// What files uploaded in this visit say about themselves, by display name:
/// the printer's listing has no materials or print time for a name that
/// does not carry them (PrusaSlicer's output template).
export interface LocalDetails {
  materials?: string[] | undefined;
  duration?: number | undefined;
  grams?: number | undefined;
  printerModel?: string | undefined;
}

const details = new Map<string, LocalDetails>();

export function rememberDetails(name: string, about: LocalDetails) {
  details.set(name, about);
}

export function localDetails(
  name: string | undefined,
): LocalDetails | undefined {
  return name === undefined ? undefined : details.get(name);
}
