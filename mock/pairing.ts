import type { components } from '../src/lib/api/schema';

type PairingRequest = components['schemas']['PairingRequest'];

/// The printer's side of device pairing, as the PrusaLink API v2 design
/// describes it (Buddy doc/prusalink-api-v2.md, feature 9). Real time, not
/// the printer's simulated clock: the limits are the firmware's seconds.
export const DIALOG_MS = 60_000;
export const RESULT_MS = 20_000;
export const LOCK_MS = 5 * 60_000;
const MAX_REQUESTS = 3;

/// The firmware's rule: Crockford base32 (no I, L, O or U), as XXXX-XXXX.
export const CODE = /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

export interface PairingDialog {
  code: string;
  client: string;
  name: string;
  until: number;
}

export interface PairingAnswer {
  status: number;
  apiKey?: string;
  /// 409 `pending` | `busy`, 429 `locked_out` | `disabled`.
  reason?: string;
  /// Seconds, with 429.
  retryAfter?: number;
}

export class MockPairing {
  /// Firmware older than pairing: the endpoints do not exist.
  supported = true;
  dialog: PairingDialog | undefined;
  #result: { code: string; paired: boolean; until: number } | undefined;
  #requests: number[] = [];
  #lockedUntil = 0;
  #cancelsInRow = 0;
  /// Cancel pressed twice in a row: no pairing until the printer restarts.
  disabled = false;
  readonly #now: () => number;

  constructor(now: () => number = Date.now) {
    this.#now = now;
  }

  /// A restart: forgets everything but whether the firmware has pairing.
  reset() {
    this.dialog = undefined;
    this.#result = undefined;
    this.#requests = [];
    this.#lockedUntil = 0;
    this.#cancelsInRow = 0;
    this.disabled = false;
  }

  get lockedFor(): number {
    this.#expire();
    return this.disabled
      ? Infinity
      : Math.max(0, this.#lockedUntil - this.#now());
  }

  /// `idle`: the printer prints nothing and shows no other dialog.
  request(body: unknown, idle: boolean): PairingAnswer {
    if (this.lockedFor > 0) return this.#lockedOut();
    const req = body as Partial<PairingRequest> | undefined;
    if (
      typeof req?.code !== 'string' ||
      !CODE.test(req.code) ||
      (req.client !== 'PrusaLink' && req.client !== 'Prusa Connect')
    )
      return { status: 400 };
    const name = typeof req.name === 'string' ? req.name : '';
    if (new TextEncoder().encode(name).length > 20) return { status: 422 };
    if (this.dialog) return { status: 409, reason: 'pending' };
    if (!idle) return { status: 409, reason: 'busy' };
    const now = this.#now();
    this.#requests = this.#requests.filter((t) => now - t < LOCK_MS);
    if (this.#requests.length >= MAX_REQUESTS) {
      this.#lockedUntil = now + LOCK_MS;
      return this.#lockedOut();
    }
    this.#requests.push(now);
    this.#result = undefined;
    this.dialog = {
      code: req.code,
      client: req.client,
      name,
      until: now + DIALOG_MS,
    };
    return { status: 202 };
  }

  result(code: string, apiKey: string): PairingAnswer {
    this.#expire();
    if (this.dialog?.code === code) return { status: 202 };
    const result = this.#result;
    if (result?.code !== code) return { status: 404 };
    if (!result.paired) return { status: 403 };
    this.#result = undefined;
    return { status: 200, apiKey };
  }

  /// The client withdraws its request: the dialog closes, nothing locks.
  withdraw(code: string): PairingAnswer {
    this.#expire();
    if (this.dialog?.code !== code) return { status: 404 };
    this.dialog = undefined;
    return { status: 204 };
  }

  /// The person at the printer presses Yes or Cancel.
  decide(paired: boolean) {
    this.#expire();
    if (!this.dialog) return;
    const now = this.#now();
    this.#result = { code: this.dialog.code, paired, until: now + RESULT_MS };
    this.dialog = undefined;
    if (paired) {
      this.#cancelsInRow = 0;
      return;
    }
    this.#lockedUntil = now + LOCK_MS;
    if (++this.#cancelsInRow >= 2) this.disabled = true;
  }

  /// The dialog closes now, as if nobody answered for 60 s.
  timeOut() {
    if (this.dialog) this.dialog.until = this.#now();
    this.#expire();
  }

  lock(locked: boolean) {
    this.#lockedUntil = locked ? this.#now() + LOCK_MS : 0;
    if (!locked) {
      this.disabled = false;
      this.#requests = [];
    }
  }

  #lockedOut(): PairingAnswer {
    return this.disabled
      ? { status: 429, reason: 'disabled' }
      : {
          status: 429,
          reason: 'locked_out',
          retryAfter: Math.ceil(this.lockedFor / 1000),
        };
  }

  #expire() {
    const now = this.#now();
    if (this.dialog && now >= this.dialog.until) {
      this.dialog = undefined;
      this.#lockedUntil = now + LOCK_MS;
    }
    if (this.#result && now >= this.#result.until) this.#result = undefined;
  }
}
