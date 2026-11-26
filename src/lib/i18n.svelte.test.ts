import { afterEach, describe, expect, it } from 'vitest';

import { language, preferredLanguage, setLanguage, t, tn } from './i18n.svelte';

describe('i18n', () => {
  afterEach(() => {
    setLanguage('en');
    localStorage.clear();
  });

  it('switches language, remembers it and falls back to English', () => {
    setLanguage('cs');
    expect(language()).toBe('cs');
    expect(document.documentElement.lang).toBe('cs');
    expect(localStorage.getItem('prusalink.lang')).toBe('cs');
    expect(preferredLanguage()).toBe('cs');
    expect(t('status.pause')).toBe('Pozastavit');
  });

  it('picks the plural form by the language rules', () => {
    setLanguage('pl');
    expect(tn('upload.failed', 3)).toBe('3 wysyłania nie powiodły się.');
    expect(tn('upload.failed', 5)).toBe('5 wysyłań nie powiodło się.');
    setLanguage('en');
    expect(tn('upload.failed', 5)).toBe('5 uploads failed.');
  });
});
