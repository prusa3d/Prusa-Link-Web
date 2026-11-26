/// Light, dark, or following the system. The choice is kept in localStorage;
/// index.html applies it before the first paint so the page never flashes.

export type ThemeMode = 'light' | 'dark' | 'auto';

export const THEME_KEY = 'prusalink.theme';
const MODES: readonly ThemeMode[] = ['auto', 'light', 'dark'];

export interface ThemeEnvironment {
  read(): string | null;
  write(mode: ThemeMode): void;
  prefersDark(): boolean;
  apply(dark: boolean): void;
}

export const browserTheme: ThemeEnvironment = {
  read: () => {
    try {
      return globalThis.localStorage.getItem(THEME_KEY);
    } catch {
      return null;
    }
  },
  write: (mode) => {
    try {
      globalThis.localStorage.setItem(THEME_KEY, mode);
    } catch {
      // Not remembered; still applied for this visit.
    }
  },
  prefersDark: () =>
    globalThis.matchMedia('(prefers-color-scheme: dark)').matches,
  apply: (dark) => {
    document.documentElement.classList.toggle('dark', dark);
  },
};

export class Theme {
  #mode = $state<ThemeMode>('auto');
  #env: ThemeEnvironment;

  constructor(env: ThemeEnvironment = browserTheme) {
    this.#env = env;
    const stored = env.read();
    this.#mode = MODES.includes(stored as ThemeMode)
      ? (stored as ThemeMode)
      : 'auto';
  }

  get mode() {
    return this.#mode;
  }

  /// Rejects anything but the three modes: nothing changes, nothing is stored.
  set mode(mode: ThemeMode) {
    if (!MODES.includes(mode)) return;
    this.#mode = mode;
    this.#env.write(mode);
    this.sync();
  }

  get dark() {
    return (
      this.#mode === 'dark' ||
      (this.#mode === 'auto' && this.#env.prefersDark())
    );
  }

  /// The next mode in auto, light, dark order, for a single toggle button.
  get next(): ThemeMode {
    return MODES[(MODES.indexOf(this.#mode) + 1) % MODES.length] ?? 'auto';
  }

  sync() {
    this.#env.apply(this.dark);
  }

  /// Follows the system while in auto. Returns the cleanup.
  watchSystem(): () => void {
    const query = globalThis.matchMedia('(prefers-color-scheme: dark)');
    const onchange = () => {
      this.sync();
    };
    query.addEventListener('change', onchange);
    return () => {
      query.removeEventListener('change', onchange);
    };
  }
}

export const theme = new Theme();
