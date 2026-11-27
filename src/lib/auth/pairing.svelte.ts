import { pairingRequest } from '../api/pairing';

/// Crockford base32, which the firmware accepts, without 0 and 1, which read
/// like O and I on a screen: 30 symbols.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

/// The printer shows its pairing dialog for 60 s; past that it answers 404.
const DIALOG_MS = 60_000;
const POLL_MS = 1000;

export function pairingCode(
  random: (bytes: Uint8Array<ArrayBuffer>) => Uint8Array = (bytes) =>
    crypto.getRandomValues(bytes),
): string {
  let chars = '';
  while (chars.length < 8)
    for (const b of random(new Uint8Array(8)))
      // Bytes from 240 up would favour the first 16 symbols.
      if (b < 240 && chars.length < 8) chars += ALPHABET.charAt(b % 30);
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

export type PairingState =
  'refused' | 'expired' | 'busy' | 'locked' | 'unsupported' | 'unreachable';

// Anything else: firmware without pairing, which checks the key first (401).
const REFUSED_REQUEST: Record<number, PairingState> = {
  0: 'unreachable',
  409: 'busy',
  429: 'locked',
};

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/// Pairing with the printer: the page makes a code, the person at the printer
/// checks it on the printer's screen and presses Pair, and the printer hands
/// the page its password.
export class Pairing {
  /// Unknown until `probe()` answers.
  supported = $state<boolean | undefined>();
  /// Set while the printer shows it.
  code = $state<string | undefined>();
  /// How the last pairing ended without the password.
  state = $state<PairingState | undefined>();
  #run = 0;

  /// Firmware with pairing answers an unknown code with 404, without
  /// showing anything on the printer's screen.
  async probe() {
    this.supported = (await pairingRequest(pairingCode())).status === 404;
  }

  /// Resolves with the password once the person pressed Pair, or with
  /// nothing when pairing ended another way (see `state`) or was stopped.
  async start(): Promise<string | undefined> {
    this.stop();
    const run = this.#run;
    const code = pairingCode();
    this.code = code;
    const { status: asked } = await pairingRequest(code, 'POST');
    if (run !== this.#run) return undefined;
    if (asked !== 202) {
      this.#end(REFUSED_REQUEST[asked] ?? 'unsupported');
      if (this.state === 'unsupported') this.supported = false;
      return undefined;
    }
    // Past the dialog the printer answers 404; this ends it if it never does.
    const giveUp = Date.now() + 2 * DIALOG_MS;
    let end: PairingState = 'expired';
    while (Date.now() < giveUp) {
      await wait(POLL_MS);
      if (run !== this.#run) return undefined;
      const { status, key } = await pairingRequest(code);
      if (run !== this.#run) return undefined;
      if (status === 200 && key) {
        this.stop();
        return key;
      }
      if (status === 403) end = 'refused';
      if (status === 403 || status === 404 || status === 200) break;
    }
    this.#end(end);
    return undefined;
  }

  /// Stops asking and closes the printer's dialog.
  cancel() {
    if (this.code) void pairingRequest(this.code, 'DELETE');
    this.stop();
  }

  /// Stops asking. The printer's dialog stays until it times out.
  stop() {
    this.#end(undefined);
  }

  #end(state: PairingState | undefined) {
    this.#run++;
    this.code = undefined;
    this.state = state;
  }
}
