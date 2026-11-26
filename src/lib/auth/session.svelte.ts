/// The PrusaLink password, sent as X-Api-Key on every API call.
///
/// The firmware accepts the password either as HTTP Digest (user "maker",
/// fixed in the firmware) or as X-Api-Key. Digest makes the browser show its
/// own login dialog; a wrong X-Api-Key answers 401 with a `WWW-Authenticate:
/// ApiKey` challenge, which browsers do not prompt for. So the app never calls
/// the API without a key, and asks for one itself.

export interface KeyStorage {
  get(): string | undefined;
  set(key: string, remember: boolean): void;
  clear(): void;
}

const STORAGE_KEY = 'prusalink.api-key';

/// localStorage when the person asks to be remembered, sessionStorage otherwise.
/// A browser with storage switched off keeps the key in memory only.
export const browserStorage: KeyStorage = {
  get() {
    try {
      return (
        globalThis.localStorage.getItem(STORAGE_KEY) ??
        globalThis.sessionStorage.getItem(STORAGE_KEY) ??
        undefined
      );
    } catch {
      return undefined;
    }
  },
  set(key, remember) {
    try {
      (remember ? globalThis.localStorage : globalThis.sessionStorage).setItem(
        STORAGE_KEY,
        key,
      );
    } catch {
      // Memory only.
    }
  },
  clear() {
    try {
      globalThis.localStorage.removeItem(STORAGE_KEY);
      globalThis.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing was stored.
    }
  },
};

export class Session {
  #key = $state<string | undefined>();
  #storage: KeyStorage;

  constructor(storage: KeyStorage = browserStorage) {
    this.#storage = storage;
    this.#key = storage.get();
  }

  get key() {
    return this.#key;
  }

  get signedIn() {
    return this.#key !== undefined;
  }

  /// Rejects an empty key: nothing changes and nothing is stored.
  signIn(key: string, remember: boolean): boolean {
    const trimmed = key.trim();
    if (!trimmed) return false;
    this.#key = trimmed;
    this.#storage.set(trimmed, remember);
    return true;
  }

  signOut() {
    this.#key = undefined;
    this.#storage.clear();
  }

  /// A key in the address fragment (`#key=…`, e.g. from the printer's QR code)
  /// signs in and is removed from the address. The fragment never reaches the
  /// printer.
  takeKeyFromFragment(
    location: Pick<Location, 'hash'>,
    history: Pick<History, 'replaceState'>,
  ) {
    const key = /(?:^#|&)key=([^&]+)/.exec(location.hash)?.[1];
    if (key && this.signIn(decodeURIComponent(key), true))
      history.replaceState(null, '', ' ');
  }
}

export const session = new Session();
