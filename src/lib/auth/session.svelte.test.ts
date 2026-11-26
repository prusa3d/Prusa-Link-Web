import { describe, expect, it } from 'vitest';

import { Session, type KeyStorage } from './session.svelte';

function memory(initial?: string) {
  const stored: { key?: string; remember?: boolean } = initial
    ? { key: initial }
    : {};
  const storage: KeyStorage = {
    get: () => stored.key,
    set: (key, remember) => {
      stored.key = key;
      stored.remember = remember;
    },
    clear: () => {
      delete stored.key;
    },
  };
  return { storage, stored };
}

describe('Session', () => {
  it('starts signed in when a key is stored', () => {
    expect(new Session(memory('abc').storage).signedIn).toBe(true);
    expect(new Session(memory().storage).signedIn).toBe(false);
  });

  it('rejects an empty key and stores nothing', () => {
    const { storage, stored } = memory();
    const session = new Session(storage);
    expect(session.signIn('   ', true)).toBe(false);
    expect(session.signedIn).toBe(false);
    expect(stored.key).toBeUndefined();
  });

  it('stores a trimmed key with the remember choice', () => {
    const { storage, stored } = memory();
    const session = new Session(storage);
    expect(session.signIn(' secret ', false)).toBe(true);
    expect(session.key).toBe('secret');
    expect(stored).toEqual({ key: 'secret', remember: false });
  });

  it('signs out and forgets the key', () => {
    const { storage, stored } = memory('abc');
    const session = new Session(storage);
    session.signOut();
    expect(session.signedIn).toBe(false);
    expect(stored.key).toBeUndefined();
  });

  it('takes a key from the address fragment and clears the address', () => {
    const session = new Session(memory().storage);
    const replaced: string[] = [];
    session.takeKeyFromFragment(
      { hash: '#key=fromqr' },
      {
        replaceState: (_data, _unused, url) => {
          replaced.push(String(url));
        },
      },
    );
    expect(session.key).toBe('fromqr');
    expect(replaced).toHaveLength(1);
  });

  it('ignores a fragment without a key', () => {
    const session = new Session(memory().storage);
    session.takeKeyFromFragment(
      { hash: '#files' },
      { replaceState: () => undefined },
    );
    expect(session.signedIn).toBe(false);
  });
});
