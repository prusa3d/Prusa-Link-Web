import { describe, expect, it } from 'vitest';

import { Theme, type ThemeEnvironment, type ThemeMode } from './theme.svelte';

function env(stored: string | null, systemDark = false) {
  const state = { stored, applied: undefined as boolean | undefined };
  const e: ThemeEnvironment = {
    read: () => state.stored,
    write: (mode: ThemeMode) => {
      state.stored = mode;
    },
    prefersDark: () => systemDark,
    apply: (dark) => {
      state.applied = dark;
    },
  };
  return { e, state };
}

describe('Theme', () => {
  it('starts on auto and follows the system', () => {
    const { e } = env(null, true);
    const theme = new Theme(e);
    expect(theme.mode).toBe('auto');
    expect(theme.dark).toBe(true);
  });

  it('remembers the choice and applies it', () => {
    const { e, state } = env(null);
    const theme = new Theme(e);
    theme.mode = 'dark';
    expect(state).toEqual({ stored: 'dark', applied: true });
    expect(new Theme(e).mode).toBe('dark');
  });

  it('ignores a stored value it does not know', () => {
    expect(new Theme(env('purple').e).mode).toBe('auto');
  });

  it('rejects an unknown mode and stores nothing', () => {
    const { e, state } = env('light');
    const theme = new Theme(e);
    theme.mode = 'purple' as ThemeMode;
    expect(theme.mode).toBe('light');
    expect(state.stored).toBe('light');
  });

  it('cycles auto, light, dark', () => {
    const theme = new Theme(env(null).e);
    const seen = [theme.next];
    theme.mode = theme.next;
    seen.push(theme.next);
    theme.mode = theme.next;
    seen.push(theme.next);
    expect(seen).toEqual(['light', 'dark', 'auto']);
  });
});
