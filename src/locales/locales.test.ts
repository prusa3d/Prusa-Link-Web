import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) =>
  JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8')) as Record<
    string,
    string
  >;

const en = read('en.json');
const others = readdirSync(new URL('.', import.meta.url)).filter(
  (f) => f.endsWith('.json') && f !== 'en.json',
);
const placeholders = (text: string) =>
  [...text.matchAll(/\{\w+\}/g)].map((m) => m[0]).sort();

describe.each(others)('%s', (file) => {
  const messages = read(file);

  it('has every English message and no stray ones', () => {
    // Plural forms beyond one/other (few, many) are the language's own.
    const own = Object.keys(messages).filter(
      (k) => !(k in en) && !/\.(?:zero|two|few|many)$/.test(k),
    );
    expect(own).toEqual([]);
    expect(Object.keys(en).filter((k) => !(k in messages))).toEqual([]);
  });

  it('keeps the placeholders', () => {
    for (const [key, text] of Object.entries(en)) {
      const own = messages[key];
      if (own === undefined) continue;
      // A language whose "one" form also covers 21, 31, … names the count.
      const mine = placeholders(own).filter(
        (p) => !(key.endsWith('.one') && p === '{count}'),
      );
      expect(mine, key).toEqual(placeholders(text));
    }
  });
});
