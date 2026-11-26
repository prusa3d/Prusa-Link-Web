import { readdirSync, readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

const DIR = new URL('../src/locales/', import.meta.url);
const ID = 'virtual:locales';

/// `virtual:locales`: every language but English as a plain list of
/// messages in one shared key order, `null` where a language has none.
/// Nine languages repeat 140 keys each; as lists the page carries the keys
/// once, which saves a few KB gzipped. English is the base, as an object.
export function locales(only?: string): Plugin {
  return {
    name: 'prusalink-locales',
    resolveId: (id) => (id === ID ? `\0${ID}` : undefined),
    load(id) {
      if (id !== `\0${ID}`) return undefined;
      const read = (file: string) => {
        this.addWatchFile(new URL(file, DIR).pathname);
        return JSON.parse(readFileSync(new URL(file, DIR), 'utf8')) as Record<
          string,
          string
        >;
      };
      const en = read('en.json');
      // A one-language build (the MINI's, per locale): that language is the
      // base, English fills only keys it lacks, and nothing else is carried.
      if (only)
        return `export default ${JSON.stringify({
          base: only,
          baseMessages: {
            ...en,
            ...(only === 'en' ? {} : read(`${only}.json`)),
          },
          keys: [],
          messages: {},
        })};`;
      const languages = Object.fromEntries(
        readdirSync(DIR)
          .filter((f) => f.endsWith('.json') && f !== 'en.json')
          .map((f) => [f.slice(0, -5), read(f)]),
      );
      const keys = [
        ...new Set([
          ...Object.keys(en),
          ...Object.values(languages).flatMap((m) => Object.keys(m)),
        ]),
      ];
      const messages = Object.fromEntries(
        Object.entries(languages).map(([code, m]) => [
          code,
          keys.map((k) => m[k] ?? null),
        ]),
      );
      return `export default ${JSON.stringify({ base: 'en', baseMessages: en, keys, messages })};`;
    },
  };
}
