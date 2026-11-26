import { describe, expect, it, vi } from 'vitest';

import { DialogStore, type PrinterDialog } from './dialog.svelte';

const runout: PrinterDialog = {
  dialog_id: 7,
  code: '12301',
  title: 'FILAMENT RUNOUT',
  text: '…',
  buttons: ['Continue'],
};

describe('DialogStore', () => {
  it('fetches the dialog only when its id changes', async () => {
    const fetch = vi.fn(() => Promise.resolve(runout));
    const store = new DialogStore(fetch);
    await store.follow(7, 'ATTENTION');
    await store.follow(7, 'ATTENTION');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(store.current).toEqual(runout);
    await store.follow(undefined, 'PRINTING');
    expect(store.current).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('asks for the red screen when the printer is in error without an id', async () => {
    const fetch = vi.fn(() => Promise.resolve(undefined));
    const store = new DialogStore(fetch);
    await store.follow(undefined, 'ERROR');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('presses a button of the dialog shown', async () => {
    const press = vi.fn(() => Promise.resolve(true));
    const store = new DialogStore(() => Promise.resolve(runout), press);
    await store.follow(7, 'ATTENTION');
    expect(await store.press('Continue')).toBe(true);
    expect(press).toHaveBeenCalledWith(7, 'Continue');
    expect(store.current).toBeUndefined();
  });
});
