import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './client';
import { session } from '../auth/session.svelte';

describe('api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    session.signOut();
  });

  it('encodes path parameters, sends the key and reads JSON', async () => {
    const fetch = vi.fn(() => Promise.resolve(Response.json({ ok: 1 })));
    vi.stubGlobal('fetch', fetch);
    session.signIn('abc', false);
    const { data } = await api.GET('/api/v1/files/{storage}/{path}', {
      params: { path: { storage: 'usb', path: 'toys/dragon.bgcode' } },
    });
    expect(data).toEqual({ ok: 1 });
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/files/usb/toys%2Fdragon.bgcode',
      { method: 'GET', headers: { 'X-Api-Key': 'abc' } },
    );
  });

  it('signs out when the printer refuses the key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('', { status: 401 }))),
    );
    session.signIn('abc', false);
    const { response } = await api.GET('/api/v1/status');
    expect(response.status).toBe(401);
    expect(session.signedIn).toBe(false);
  });
});
