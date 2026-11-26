import { describe, expect, it, vi } from 'vitest';

import { PrinterStore, Refused, type Status } from './printer.svelte';

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

  it('asks for the expanded status, and for the plain one once refused', async () => {
    const asked: boolean[] = [];
    const store = new PrinterStore((expanded) => {
      asked.push(expanded);
      return expanded
        ? Promise.reject(new Refused())
        : Promise.resolve({ printer: idle });
    });
    store.expanded = true;
    await store.refresh();
    await store.refresh();
    expect(asked).toEqual([true, false, false]);
    expect(store.offline).toBe(false);
  });

  it('polls slower in a background tab', async () => {
    vi.useFakeTimers();
    let hidden = false;
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    let polls = 0;
    const store = new PrinterStore(() => {
      polls++;
      return Promise.resolve({ printer: idle });
    });
    const stop = store.poll(1000, 5000);
    await vi.advanceTimersByTimeAsync(3000);
    expect(polls).toBe(4);
    hidden = true;
    await vi.advanceTimersByTimeAsync(1000);
    const before = polls;
    await vi.advanceTimersByTimeAsync(4000);
    expect(polls - before).toBeLessThanOrEqual(1);
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(polls).toBeGreaterThan(before);
    stop();
    vi.useRealTimers();
  });
});
