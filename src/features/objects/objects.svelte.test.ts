import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlateObjects } from './objects.svelte';

const listing = {
  current: 1,
  objects: [
    { id: 0, canceled: false, name: 'Cylinder' },
    { id: 1, canceled: true },
  ],
};
const shapes = [
  { name: 'Cylinder', polygon: [[1, 2]] as [number, number][] },
  { name: 'Sphere', polygon: [[3, 4]] as [number, number][] },
];
const file = {
  name: 'SHAPES~1.BGC',
  displayName: 'shapes.bgcode',
  path: 'plates/SHAPES~1.BGC',
};

describe('PlateObjects', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('joins the printer list with the file outlines, downloaded once per job', async () => {
    const list = vi.fn(() => Promise.resolve(listing));
    const download = vi.fn(() => Promise.resolve(shapes));
    const store = new PlateObjects(list, download);
    await store.follow(4, 1, file);
    await store.follow(4, 1, file);
    expect(list).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledWith(
      'plates/SHAPES~1.BGC',
      'plates/shapes.bgcode',
    );
    expect(download).toHaveBeenCalledTimes(1);
    expect(store.items).toEqual([
      {
        id: 0,
        name: 'Cylinder',
        canceled: false,
        current: false,
        polygon: [[1, 2]],
      },
      {
        id: 1,
        name: 'Sphere',
        canceled: true,
        current: true,
        polygon: [[3, 4]],
      },
    ]);
    await store.follow(4, 2, file);
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('downloads nothing for a print without objects', async () => {
    const download = vi.fn(() => Promise.resolve(undefined));
    const store = new PlateObjects(
      () => Promise.resolve({ objects: [] }),
      download,
    );
    await store.follow(6, 0, file);
    expect(download).not.toHaveBeenCalled();
  });

  it('cancels an object once the printer reports it cancelled', async () => {
    const cancel = vi.fn(() => Promise.resolve(true));
    let canceled = false;
    const list = vi.fn(() =>
      Promise.resolve({
        objects: [{ id: 0, canceled, name: 'Cylinder' }],
      }),
    );
    const store = new PlateObjects(list, () => Promise.resolve(shapes), cancel);
    await store.follow(4, 1, file);
    canceled = true;
    expect(await store.cancel(0)).toBe(true);
    expect(cancel).toHaveBeenCalledWith(4, 0, true);
    expect(list).toHaveBeenLastCalledWith(4, true);
    expect(store.items[0]?.canceled).toBe(true);
    expect(store.failed).toBeUndefined();
  });

  it('says it failed when the printer never reports the cancel', async () => {
    vi.useFakeTimers();
    const store = new PlateObjects(
      () => Promise.resolve(listing),
      () => Promise.resolve(shapes),
      () => Promise.resolve(true),
    );
    await store.follow(4, 1, file);
    const done = store.cancel(0);
    await vi.advanceTimersByTimeAsync(6000);
    expect(await done).toBe(false);
    expect(store.failed).toBe(0);
    vi.useRealTimers();
  });
});
