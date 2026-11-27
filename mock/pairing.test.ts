import { describe, expect, it } from 'vitest';

import { handleApi, type MockResponse } from './api.ts';
import { DIALOG_MS, LOCK_MS, MockPairing, RESULT_MS } from './pairing.ts';
import { MockPrinter } from './printer.ts';

const ask = { code: 'K7QX-29FM', client: 'PrusaLink', name: 'Chrome' };

function clock() {
  const at = { now: 0 };
  return { at, pairing: new MockPairing(() => at.now) };
}

describe('mock pairing', () => {
  it('hands out the key once after Pair, then forgets the code', () => {
    const { pairing } = clock();
    expect(pairing.request(ask, true).status).toBe(202);
    expect(pairing.result(ask.code, 'k').status).toBe(202);
    pairing.decide(true);
    expect(pairing.result(ask.code, 'k')).toEqual({ status: 200, apiKey: 'k' });
    expect(pairing.result(ask.code, 'k').status).toBe(404);
  });

  it('answers a refusal for 20 s, then the code is unknown', () => {
    const { at, pairing } = clock();
    pairing.request(ask, true);
    pairing.decide(false);
    expect(pairing.result(ask.code, 'k').status).toBe(403);
    at.now += RESULT_MS;
    expect(pairing.result(ask.code, 'k').status).toBe(404);
  });

  it('closes the dialog after 60 s and locks out for 5 minutes', () => {
    const { at, pairing } = clock();
    pairing.request(ask, true);
    at.now += DIALOG_MS;
    expect(pairing.result(ask.code, 'k').status).toBe(404);
    expect(pairing.request({ ...ask, code: 'AAAA-BBBB' }, true)).toEqual({
      status: 429,
      reason: 'locked_out',
      retryAfter: 300,
    });
    at.now += LOCK_MS;
    expect(pairing.request({ ...ask, code: 'AAAA-BBBB' }, true).status).toBe(
      202,
    );
  });

  it('pairs only when idle, one request at a time', () => {
    const { pairing } = clock();
    expect(pairing.request(ask, false)).toEqual({
      status: 409,
      reason: 'busy',
    });
    pairing.request(ask, true);
    expect(pairing.request({ ...ask, code: 'AAAA-BBBB' }, true)).toEqual({
      status: 409,
      reason: 'pending',
    });
  });

  it('closes the dialog when the client withdraws, without a lockout', () => {
    const { pairing } = clock();
    pairing.request(ask, true);
    expect(pairing.withdraw('AAAA-BBBB').status).toBe(404);
    expect(pairing.withdraw(ask.code).status).toBe(204);
    expect(pairing.dialog).toBeUndefined();
    expect(pairing.result(ask.code, 'k').status).toBe(404);
    expect(pairing.request({ ...ask, code: 'AAAA-BBBB' }, true).status).toBe(
      202,
    );
  });

  it('takes any Crockford base32 code, as the firmware does', () => {
    expect(
      clock().pairing.request({ ...ask, code: '0000-1111' }, true).status,
    ).toBe(202);
  });

  it('refuses a name over 20 bytes', () => {
    expect(
      clock().pairing.request({ ...ask, name: 'Č'.repeat(11) }, true).status,
    ).toBe(422);
  });

  it('refuses a fourth request within 5 minutes', () => {
    const { pairing } = clock();
    for (const code of ['AAAA-AAAA', 'BBBB-BBBB', 'CCCC-CCCC']) {
      expect(pairing.request({ ...ask, code }, true).status).toBe(202);
      pairing.decide(true);
    }
    expect(pairing.request({ ...ask, code: 'DDDD-DDDD' }, true).status).toBe(
      429,
    );
  });

  it('stops pairing until a restart after Cancel twice in a row', () => {
    const { at, pairing } = clock();
    pairing.request(ask, true);
    pairing.decide(false);
    at.now += LOCK_MS;
    pairing.request({ ...ask, code: 'AAAA-BBBB' }, true);
    pairing.decide(false);
    at.now += LOCK_MS * 10;
    expect(pairing.request({ ...ask, code: 'CCCC-DDDD' }, true)).toEqual({
      status: 429,
      reason: 'disabled',
    });
    pairing.reset();
    expect(pairing.request({ ...ask, code: 'CCCC-DDDD' }, true).status).toBe(
      202,
    );
  });

  it.each([
    { ...ask, code: 'K7QX29FM' },
    { ...ask, code: 'O0I1-2345' },
    { ...ask, code: 'K7QX-29FL' },
    { ...ask, code: 'UUUU-2345' },
    { ...ask, code: 'k7qx-29fm' },
    { ...ask, client: 'Other' },
    undefined,
  ])('refuses a malformed request %o', (body) => {
    expect(clock().pairing.request(body, true).status).toBe(400);
  });
});

describe('mock pairing over the API', () => {
  const post = (printer: MockPrinter, body: unknown): MockResponse =>
    handleApi(printer, {
      method: 'POST',
      path: '/api/v1/pairing',
      headers: { 'x-api-key': 'pairing' },
      body: new TextEncoder().encode(JSON.stringify(body)),
    });
  const poll = (printer: MockPrinter) =>
    handleApi(printer, {
      method: 'GET',
      path: `/api/v1/pairing/${ask.code}`,
      headers: { 'x-api-key': 'pairing' },
    });

  it('needs no key and answers the key with the Digest user', () => {
    const printer = new MockPrinter();
    expect(post(printer, ask).status).toBe(202);
    printer.pairing.decide(true);
    expect(poll(printer)).toEqual({
      status: 200,
      body: { api_key: printer.apiKey, user: 'maker' },
    });
  });

  it('refuses while printing or while the printer asks something', () => {
    const printer = new MockPrinter();
    printer.state = 'PRINTING';
    expect(post(printer, ask)).toEqual({
      status: 409,
      body: { reason: 'busy' },
    });
    printer.state = 'IDLE';
    printer.question = 'Filament runout';
    expect(post(printer, ask).status).toBe(409);
  });

  it('withdraws with DELETE and says how long a lockout lasts', () => {
    const printer = new MockPrinter();
    post(printer, ask);
    const withdraw = handleApi(printer, {
      method: 'DELETE',
      path: `/api/v1/pairing/${ask.code}`,
      headers: {},
    });
    expect(withdraw.status).toBe(204);
    printer.pairing.lock(true);
    expect(post(printer, ask).headers).toEqual({ 'retry-after': '300' });
  });

  it('answers 401 on firmware without pairing, which checks the key first', () => {
    const printer = new MockPrinter();
    printer.pairing.supported = false;
    expect(post(printer, ask).status).toBe(401);
    expect(poll(printer).headers?.['www-authenticate']).toMatch(/^ApiKey /);
  });
});
