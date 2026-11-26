/// Which files the app shows and uploads.

const PRINTABLE = ['.gcode', '.bgcode'];

/// Names an operating system leaves on a stick or in a folder.
const SYSTEM_NAMES = new Set([
  'system volume information',
  '$recycle.bin',
  '__macosx',
  'thumbs.db',
  'desktop.ini',
]);

/// Dot-files and folders (`.Trashes`, macOS `._` twins, `.DS_Store`) and the
/// folders Windows and archivers add.
export function isHidden(name: string): boolean {
  return name.startsWith('.') || SYSTEM_NAMES.has(name.toLowerCase());
}

/// A path is hidden when any part of it is: `.git/x.gcode` is never shown.
export function isHiddenPath(path: string): boolean {
  return path.split('/').some((part) => part !== '' && isHidden(part));
}

/// Judged by the extension. Mobile browsers report G-code with no MIME type or
/// a generic one, so the type is not trusted.
export function isPrintable(name: string): boolean {
  const lower = name.toLowerCase();
  return !isHidden(name) && PRINTABLE.some((ext) => lower.endsWith(ext));
}

/// The `accept` filter for the file picker. Mobile pickers (iOS, Android)
/// grey out files whose type they cannot map to `.gcode`/`.bgcode`, so on a
/// touch-first device the picker shows everything and the app filters.
export function pickerAccept(finePointer: boolean): string | undefined {
  return finePointer ? PRINTABLE.join(',') : undefined;
}
