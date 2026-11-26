import { afterEach, describe, expect, it, vi } from 'vitest';

import { thumbnailUrl } from './thumbnail';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('thumbnailUrl', () => {
  it('falls back to the next picture and loads one at a time', async () => {
    let active = 0;
    let peak = 0;
    const fetchMock = vi.fn(async (ref: string) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
      return ref.includes('/l/')
        ? new Response('x', { status: 404 })
        : new Response(new Blob(['png']));
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:ok' });
    const urls = await Promise.all(
      ['A', 'B', 'C', 'D'].map((n) =>
        thumbnailUrl(undefined, `/thumb/l/usb/${n}`, `/thumb/s/usb/${n}`),
      ),
    );
    expect(urls).toEqual(['blob:ok', 'blob:ok', 'blob:ok', 'blob:ok']);
    expect(peak).toBe(1);
  });
});
