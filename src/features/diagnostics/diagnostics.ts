import { fetchDump } from '../../lib/api/dump';

/// Saves the printer's crash dump (a RAM image: it may hold secrets).
/// False when there is none.
export async function downloadDump(): Promise<boolean> {
  const file = await fetchDump();
  if (!file) return false;
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
  return true;
}

/// A prefilled e-mail to support: what the printer said, the printer and
/// its firmware, the help page. A mailto cannot attach the dump.
export function supportMail(about: {
  printer?: string | undefined;
  firmware?: string | undefined;
  code?: string | undefined;
  title?: string | undefined;
  text?: string | undefined;
}): string {
  const lines = [
    `Printer: ${about.printer ?? '?'}`,
    `Firmware: ${about.firmware ?? '?'}`,
    about.code && `Error: ${about.code} https://prusa.io/${about.code}`,
    about.title && `Screen: ${about.title}`,
    about.text,
    '',
    'Crash dump: attached (downloaded from PrusaLink).',
  ].filter((l) => l !== undefined && l !== '');
  const subject = `Printer crash${about.code ? ` ${about.code}` : ''}: ${about.title ?? ''}`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}
