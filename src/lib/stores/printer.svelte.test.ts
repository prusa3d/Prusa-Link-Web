import { describe, expect, it } from 'vitest';

import { PrinterStore, type Status } from './printer.svelte';

const idle = { state: 'IDLE', temp_bed: 22, temp_nozzle: 22 } as Status;

describe('PrinterStore', () => {
  it('starts empty and online', () => {
    const store = new PrinterStore(() => Promise.resolve({}));
    expect(store.status).toBeUndefined();
    expect(store.offline).toBe(false);
  });

  it('takes the printer state from a refresh', async () => {
    const store = new PrinterStore(() => Promise.resolve({ printer: idle }));
    await store.refresh();
    expect(store.status?.state).toBe('IDLE');
  });

  it('goes offline on a failed refresh and keeps the last state', async () => {
    let fail = false;
    const store = new PrinterStore(() =>
      fail
        ? Promise.reject(new Error('down'))
        : Promise.resolve({ printer: idle }),
    );
    await store.refresh();
    fail = true;
    await store.refresh();
    expect(store.offline).toBe(true);
    expect(store.status?.state).toBe('IDLE');
  });
});
