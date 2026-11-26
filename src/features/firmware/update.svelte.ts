import {
  latestRelease,
  updateFor,
  type Update,
} from '../../lib/firmware/releases';
import type { Variant } from '../../lib/printer/models';

const DISMISSED = 'prusalink.firmware-dismissed';

function readDismissed(): string | null {
  try {
    return globalThis.localStorage.getItem(DISMISSED);
  } catch {
    return null;
  }
}

/// A newer firmware for this printer: offered quietly (a card beside the
/// files, an icon in the header on phones) until dismissed for that version.
export class FirmwareUpdate {
  #update = $state<Update | undefined>();
  #dismissed = $state(readDismissed());
  #current = $state<string | undefined>();
  /// The dialog with the download.
  open = $state(false);

  /// The update to offer, unless dismissed.
  get offer(): Update | undefined {
    return this.#update && this.#dismissed !== this.#update.version
      ? this.#update
      : undefined;
  }

  /// The running version, without the build suffix.
  get current() {
    return this.#current;
  }

  async check(firmware: string, variant: Variant | undefined) {
    this.#current = firmware.replace(/\+.*$/, '');
    const release = await latestRelease();
    this.#update = release && updateFor(release, firmware, variant);
  }

  dismiss() {
    if (!this.#update) return;
    this.#dismissed = this.#update.version;
    this.open = false;
    try {
      globalThis.localStorage.setItem(DISMISSED, this.#update.version);
    } catch {
      // Hidden for this visit only.
    }
  }
}

export const firmwareUpdate = new FirmwareUpdate();
