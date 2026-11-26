import { describe, expect, it } from 'vitest';

import { when } from './when';

const now = Date.UTC(2026, 10, 26, 15, 30);
const at = (secondsAgo: number) => now / 1000 - secondsAgo;

describe('when', () => {
  it('says recent times relatively', () => {
    expect(when(at(10), now, 'en')).toBe('now');
    expect(when(at(7 * 60), now, 'en')).toBe('7 minutes ago');
    expect(when(at(3 * 3600), now, 'en')).toBe('3 hours ago');
    expect(when(at(26 * 3600), now, 'en')).toBe('yesterday');
    expect(when(at(7 * 60), now, 'cs')).toBe('před 7 minutami');
  });

  it('gives the date after a week', () => {
    expect(when(at(10 * 86400), now, 'en')).toBe('Nov 16');
  });
});
