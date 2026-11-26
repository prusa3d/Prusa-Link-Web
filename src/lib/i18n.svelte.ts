import locales from 'virtual:locales';

import type en from '../locales/en.json';

export type MessageKey = keyof typeof en;

/// The languages the printers speak, by their own names.
const NAMES = {
  en: 'English',
  cs: 'Čeština',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  ja: '日本語',
  pl: 'Polski',
  uk: 'Українська',
} as const;

const INDEX = new Map(locales.keys.map((key, i) => [key, i]));

export type Language = keyof typeof NAMES;

/// The languages this build carries: all of them, or one (the MINI's).
export const LANGUAGES = Object.fromEntries(
  Object.entries(NAMES).filter(
    ([code]) => code === locales.base || code in locales.messages,
  ),
) as Partial<Record<Language, string>>;

const BASE = locales.base as Language;

export const LANGUAGE_KEY = 'prusalink.lang';

const isLanguage = (code: string | null | undefined): code is Language =>
  !!code && code in LANGUAGES;

let current = $state<Language>(BASE);

/// The current language's own message, if it has one.
function own(key: string): string | undefined {
  const i = INDEX.get(key);
  if (current === BASE) return locales.baseMessages[key];
  return i === undefined
    ? undefined
    : (locales.messages[current]?.[i] ?? undefined);
}

/// The stored choice, else the browser's first language PrusaLink speaks.
export function preferredLanguage(): Language {
  let stored: string | null = null;
  try {
    stored = globalThis.localStorage.getItem(LANGUAGE_KEY);
  } catch {
    // No storage: fall through to the browser's languages.
  }
  if (isLanguage(stored)) return stored;
  return (
    globalThis.navigator.languages
      .map((tag) => tag.slice(0, 2).toLowerCase())
      .find(isLanguage) ?? BASE
  );
}

export function language(): Language {
  return current;
}

/// Switches the page's language and, unless told not to, remembers it.
export function setLanguage(code: Language, remember = true) {
  if (remember) {
    try {
      globalThis.localStorage.setItem(LANGUAGE_KEY, code);
    } catch {
      // Applied for this visit only.
    }
  }
  current = code;
  document.documentElement.lang = code;
}

/// A message in the current language; a key it leaves out falls back to
/// the base language.
export function t(
  key: MessageKey,
  params: Record<string, string | number> = {},
): string {
  return (own(key) ?? locales.baseMessages[key] ?? key).replace(
    /\{(\w+)\}/g,
    (_, name: string) => String(params[name] ?? `{${name}}`),
  );
}

type PluralBase<K> = K extends `${infer B}.one` ? B : never;

/// The plural form the language's rules pick for `count` (Czech, Polish and
/// Ukrainian have few and many too), falling back to one/other.
export function tn(base: PluralBase<MessageKey>, count: number): string {
  const form = `${base}.${new Intl.PluralRules(current).select(count)}`;
  const fallback = `${base}.${count === 1 ? 'one' : 'other'}`;
  return t((own(form) ? form : fallback) as MessageKey, { count });
}
