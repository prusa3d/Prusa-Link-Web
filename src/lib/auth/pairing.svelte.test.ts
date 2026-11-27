import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Pairing, pairingCode } from './pairing.svelte';

/// The firmware's check: Crockford base32 (0-9 A-Z without I, L, O, U).
const FIRMWARE_CODE = /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

/// The printer answers POST with `asked`, then each poll with the next of
/// `polls` (the last one repeats).
function printer(asked: number, polls: (number | { key: string })[] = []) {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (init.method === 'POST')
        return Promise.resolve(new Response(null, { status: asked }));
      const next = polls.length > 1 ? polls.shift() : polls[0];
      return Promise.resolve(
        typeof next === 'object'
          ? Response.json({ api_key: next.key, user: 'maker' })
          : new Response(null, { status: next ?? 404 }),
      );
    }),
  );
  return calls;
}

describe('pairingCode', () => {
  it('always passes the firmware rule, without 0, 1 or look-alikes', () => {
    for (let i = 0; i < 2000; i++) {
      const code = pairingCode();
      expect(code).toMatch(FIRMWARE_CODE);
      expect(code).not.toMatch(/[01ILOU]/);
    }
  });

  it('maps bytes evenly and skips the ones that would bias it', () => {
    expect(pairingCode((bytes) => bytes.map((_, i) => 31 * i))).toBe(
      '2345-6789',
    );
    let call = 0;
    const code = pairingCode((bytes) =>
      call++ === 0 ? bytes.fill(255) : bytes.fill(29),
    );
    expect(code).toBe('ZZZZ-ZZZZ');
  });
});

describe('Pairing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the code while waiting and resolves with the key after Pair', async () => {
    const calls = printer(202, [202, 202, { key: 'secret' }]);
    const pairing = new Pairing();
    const done = pairing.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(pairing.code).toMatch(/^\w{4}-\w{4}$/);
    const code = pairing.code ?? '';
    await vi.advanceTimersByTimeAsync(3000);
    await expect(done).resolves.toBe('secret');
    expect(pairing.code).toBeUndefined();
    expect(pairing.state).toBeUndefined();
    expect(calls[0]?.init.body).toBe(
      JSON.stringify({ code, client: 'PrusaLink' }),
    );
    expect(calls.at(-1)?.url).toBe(`/api/v1/pairing/${code}`);
    // Never without a key: that would make the browser ask for one.
    for (const { init } of calls)
      expect(init.headers).toMatchObject({ 'X-Api-Key': 'pairing' });
  });

  it.each([
    [403, 'refused'],
    [404, 'expired'],
  ] as const)('ends when the printer answers %i', async (answer, state) => {
    printer(202, [202, answer]);
    const pairing = new Pairing();
    const done = pairing.start();
    await vi.advanceTimersByTimeAsync(2000);
    await expect(done).resolves.toBeUndefined();
    expect(pairing.state).toBe(state);
    expect(pairing.code).toBeUndefined();
  });

  it('gives up when the printer stops answering', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) =>
        init.method === 'POST'
          ? Promise.resolve(new Response(null, { status: 202 }))
          : Promise.reject(new TypeError('Failed to fetch')),
      ),
    );
    const pairing = new Pairing();
    const done = pairing.start();
    await vi.advanceTimersByTimeAsync(130_000);
    await expect(done).resolves.toBeUndefined();
    expect(pairing.state).toBe('expired');
  });

  it.each([
    [409, 'busy', undefined],
    [429, 'locked', undefined],
    [401, 'unsupported', false],
  ] as const)(
    'reports a refused request (%i) without polling',
    async (asked, state, supported) => {
      const calls = printer(asked);
      const pairing = new Pairing();
      await expect(pairing.start()).resolves.toBeUndefined();
      expect(pairing.state).toBe(state);
      expect(pairing.supported).toBe(supported);
      expect(calls).toHaveLength(1);
    },
  );

  it('withdraws the request when cancelled', async () => {
    const calls = printer(202, [202]);
    const pairing = new Pairing();
    void pairing.start();
    await vi.advanceTimersByTimeAsync(0);
    const code = pairing.code ?? '';
    pairing.cancel();
    await vi.advanceTimersByTimeAsync(0);
    expect(calls.at(-1)).toMatchObject({
      url: `/api/v1/pairing/${code}`,
      init: { method: 'DELETE' },
    });
    expect(pairing.code).toBeUndefined();
  });

  it('stops polling when stopped', async () => {
    const calls = printer(202, [202]);
    const pairing = new Pairing();
    const done = pairing.start();
    await vi.advanceTimersByTimeAsync(1500);
    pairing.stop();
    const count = calls.length;
    await vi.advanceTimersByTimeAsync(5000);
    await expect(done).resolves.toBeUndefined();
    expect(calls).toHaveLength(count);
    expect(pairing.state).toBeUndefined();
  });

  it.each([
    [404, true],
    [401, false],
  ])('probes support with an unknown code (%i)', async (status, supported) => {
    const calls = printer(202, [status]);
    const pairing = new Pairing();
    await pairing.probe();
    expect(pairing.supported).toBe(supported);
    expect(calls[0]?.init.method).toBe('GET');
  });
});
