import { putToUsb } from '../../lib/api/upload';
import {
  checkFile,
  downloadFile,
  fetchableUrl,
  latestRelease,
  updateFor,
  type Update,
} from '../../lib/firmware/releases';
import type { Variant } from '../../lib/printer/models';
import { usbFirmware } from './usb-files.svelte';

const DISMISSED = 'prusalink.firmware-dismissed';

/// Getting a firmware file onto the printer's USB root, where the printer
/// finds it when it starts and asks on its screen to flash it.
export type Transfer =
  | { step: 'idle' }
  | { step: 'downloading' | 'uploading'; fraction: number }
  | { step: 'done'; version: string | undefined }
  | {
      step: 'failed';
      /// refused: the printer's firmware takes G-code uploads only (415).
      reason: 'refused' | 'failed' | 'notFirmware' | 'otherPrinter';
    };

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
  #variant: Variant | undefined;
  #transfer = $state<Transfer>({ step: 'idle' });
  #otherVersion = $state<string | undefined>();
  #abort: AbortController | undefined;
  /// The dialog with the download.
  open = $state(false);
  /// Files are being dragged over the page while the dialog is open: the
  /// dialog's drop area lights up, and a drop anywhere lands there.
  dragging = $state(false);
  /// The person has the file (or is getting it) and can hand it to the page.
  downloaded = $state(false);
  /// The page could not fetch the file itself, so the person downloads it.
  fetchFailed = $state(false);

  get transfer(): Transfer {
    return this.#transfer;
  }

  get busy() {
    const { step } = this.#transfer;
    return step === 'downloading' || step === 'uploading';
  }

  /// The version of a file handed over that is not the offered one.
  get otherVersion() {
    return this.#otherVersion;
  }

  /// The copy of the offered file the page can fetch itself.
  get fetchable(): string | undefined {
    const url = this.offer?.file?.url;
    return url && !this.fetchFailed ? fetchableUrl(url) : undefined;
  }

  /// One click: fetch the offered file, then put it on the printer. When the
  /// fetch fails the dialog falls back to the download link and a drop area.
  async install() {
    const offer = this.offer;
    const file = offer?.file;
    const url = this.fetchable;
    if (!offer || !file || !url || this.busy) return;
    const abort = this.#start();
    let picked: File;
    try {
      picked = await downloadFile(
        url,
        file.name,
        (fraction) => {
          this.#transfer = { step: 'downloading', fraction };
        },
        abort.signal,
      );
    } catch {
      this.#transfer = { step: 'idle' };
      if (!abort.signal.aborted) this.fetchFailed = true;
      return;
    }
    await this.#upload(picked, offer.version, abort);
  }

  /// A firmware file the person picked or dropped (here or anywhere on the
  /// page): checked by its name, then put on the printer.
  async receive(file: File) {
    if (this.busy) return;
    this.open = true;
    this.downloaded = true;
    const check = checkFile(file.name, this.#variant, this.offer?.version);
    if (!check.ok) {
      this.#otherVersion = undefined;
      this.#transfer = { step: 'failed', reason: check.reason };
      return;
    }
    const abort = this.#start();
    this.#otherVersion = check.otherVersion ? check.version : undefined;
    await this.#upload(file, check.version, abort);
  }

  cancel() {
    this.#abort?.abort();
  }

  /// Closes the dialog; a finished or failed transfer is forgotten.
  close() {
    this.open = false;
    if (!this.busy) {
      this.#transfer = { step: 'idle' };
      this.#otherVersion = undefined;
    }
  }

  #start(): AbortController {
    const abort = new AbortController();
    this.#abort = abort;
    this.#otherVersion = undefined;
    this.#transfer = { step: 'downloading', fraction: 0 };
    return abort;
  }

  async #upload(
    file: File,
    version: string | undefined,
    abort: AbortController,
  ) {
    this.#transfer = { step: 'uploading', fraction: 0 };
    const status = await putToUsb(
      file,
      '',
      (fraction) => {
        this.#transfer = { step: 'uploading', fraction };
      },
      abort.signal,
      true,
    );
    if (status >= 200 && status < 300) {
      this.#transfer = { step: 'done', version };
      // PrusaLink 2 installs it from the page (the USB firmware card).
      if (__FIRMWARE_FLASH__) void usbFirmware.refresh();
    } else if (abort.signal.aborted) this.#transfer = { step: 'idle' };
    else
      this.#transfer = {
        step: 'failed',
        reason: status === 415 ? 'refused' : 'failed',
      };
  }

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
    this.#variant = variant;
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
