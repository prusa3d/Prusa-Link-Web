const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/// When a file was saved, the way people say it: "7 minutes ago",
/// "yesterday", and the date once it is more than a week old.
export function when(seconds: number, now: number, lang: string): string {
  const ago = Math.max(0, now / 1000 - seconds);
  if (ago >= 7 * DAY)
    return new Date(seconds * 1000).toLocaleDateString(lang, {
      day: 'numeric',
      month: 'short',
    });
  const relative = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  if (ago < MINUTE) return relative.format(0, 'second');
  if (ago < HOUR) return relative.format(-Math.floor(ago / MINUTE), 'minute');
  if (ago < DAY) return relative.format(-Math.floor(ago / HOUR), 'hour');
  return relative.format(-Math.floor(ago / DAY), 'day');
}
