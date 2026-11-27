import type { PrintCandidate } from './uploaded';
import { fileVersion } from '../../lib/api/thumbnail';
import { uploadToUsb } from '../../lib/api/upload';
import { expandZips, type Picked } from '../../lib/files/collect';
import {
  rememberDetails,
  rememberThumbnail,
} from '../../lib/files/local-thumbnails';
import { readMetadata } from '../../lib/files/metadata';
import { fileKey, rememberHeader } from '../../lib/files/header-cache';
import { readHeader } from '../../lib/files/header';
import { type Clash, settleClashes } from './clash';
import { t, tn } from '../../lib/i18n.svelte';
import { files, label } from '../files/files.svelte';
import { firmwareUpdate } from '../firmware/update.svelte';

export interface Notice {
  text: string;
  error: boolean;
}

/// One file of the batch, for its own line in the upload panel.
export interface UploadItem {
  name: string;
  state: 'waiting' | 'uploading' | 'done' | 'failed' | 'cancelled';
  /// 0 to 1 while uploading.
  fraction: number;
}

/// How long the finished batch stays listed.
export const UPLOADED_SHOWN_S = 20;

/// Uploads to the USB drive, from the drop zone or a drop anywhere on the
/// page. One batch at a time; read-only from outside by design.
export class Uploads {
  #busy = $state<string | undefined>();
  #notice = $state<Notice | undefined>();
  #abort: AbortController | undefined;
  #clashes = $state<string[]>([]);
  #items = $state<UploadItem[]>([]);
  #finished = $state(false);
  #hide: ReturnType<typeof setTimeout> | undefined;
  #decide: ((choice: Clash) => void) | undefined;
  /// Called when a single file was uploaded, to offer printing it.
  onuploaded: ((file: PrintCandidate) => void) | undefined;

  /// What is happening now, for the progress line.
  get busy() {
    return this.#busy;
  }

  /// The files of the current or last batch, each with its own state.
  get items(): readonly UploadItem[] {
    return this.#items;
  }

  /// The batch is over and its list is shown for a while.
  get finished() {
    return this.#finished;
  }

  dismissList() {
    clearTimeout(this.#hide);
    this.#items = [];
    this.#finished = false;
  }

  #set(i: number, change: Partial<UploadItem>) {
    this.#items = this.#items.map((item, j) =>
      j === i ? { ...item, ...change } : item,
    );
  }

  get notice() {
    return this.#notice;
  }

  cancel() {
    this.#abort?.abort();
  }

  /// Names already in the folder, while the person decides what to do.
  get clashes(): readonly string[] {
    return this.#clashes;
  }

  decide(choice: Clash) {
    this.#decide?.(choice);
  }

  #ask(names: string[]): Promise<Clash> {
    this.#clashes = names;
    return new Promise((resolve) => {
      this.#decide = (choice) => {
        this.#clashes = [];
        this.#decide = undefined;
        resolve(choice);
      };
    });
  }

  async upload(picked: Picked) {
    if (this.#busy !== undefined) return;
    this.dismissList();
    this.#notice = undefined;
    const abort = new AbortController();
    this.#abort = abort;
    const cancelled = () => abort.signal.aborted;
    try {
      if (picked.zips.length) {
        this.#busy = t('upload.unzipping', {
          name: picked.zips.map((z) => z.name).join(', '),
        });
        picked = await expandZips(picked);
      }
      // The update dialog takes one firmware file; without it, none.
      const firmware = __FIRMWARE_UPDATE__ ? picked.firmware[0] : undefined;
      if (__FIRMWARE_UPDATE__ && firmware)
        void firmwareUpdate.receive(firmware);
      const skipped =
        picked.skipped + picked.firmware.length - (firmware ? 1 : 0);
      if (skipped)
        this.#notice = {
          text: tn('upload.skipped', skipped),
          error: false,
        };
      if (!picked.files.length) {
        if (firmware) return;
        this.#notice = { text: t('upload.nothing'), error: false };
        return;
      }
      const existing = files.files.map(label);
      const clashing = picked.files
        .map(({ file }) => file.name)
        .filter((n) => existing.includes(n));
      const choice = clashing.length ? await this.#ask(clashing) : 'replace';
      picked = {
        ...picked,
        files: settleClashes(picked.files, existing, choice),
      };
      if (!picked.files.length) return;
      this.#items = picked.files.map(({ file }) => ({
        name: file.name,
        state: 'waiting',
        fraction: 0,
      }));
      let failed = 0;
      for (const [i, { file }] of picked.files.entries()) {
        if (cancelled()) {
          this.#set(i, { state: 'cancelled' });
          continue;
        }
        this.#busy = t('upload.uploading', {
          index: i + 1,
          total: picked.files.length,
          name: file.name,
        });
        this.#set(i, { state: 'uploading' });
        // Read while it uploads: the printer then need not send the head of
        // the file back for cancel object or tool mapping.
        const header =
          __CANCEL_OBJECT__ || __TOOL_MAPPING__
            ? readHeader(file.stream())
            : undefined;
        const dir = files.path;
        const ok = await uploadToUsb(
          file,
          files.path,
          (f) => {
            this.#set(i, { fraction: f });
          },
          abort.signal,
          clashing.length > 0 && choice === 'replace',
        );
        if (!ok && !cancelled()) failed += 1;
        let state: UploadItem['state'] = 'failed';
        if (ok) state = 'done';
        else if (cancelled()) state = 'cancelled';
        this.#set(i, { state, fraction: ok ? 1 : 0 });
        if (ok) {
          if (__CANCEL_OBJECT__ || __TOOL_MAPPING__) {
            const read = await header;
            if (read) rememberHeader(fileKey(dir, file.name), read);
          }
          // Each file shows in the list as soon as it is on the drive.
          await files.refresh();
          const meta = await readMetadata(file, file.name);
          if (meta.thumbnail) rememberThumbnail(file.name, meta.thumbnail);
          rememberDetails(file.name, meta);
        }
      }
      if (failed)
        this.#notice = { text: tn('upload.failed', failed), error: true };
      await files.refresh();
      const [only] = picked.files;
      if (picked.files.length === 1 && only && !failed && !cancelled()) {
        const entry = files.files.find((f) => label(f) === only.file.name);
        if (entry) {
          this.onuploaded?.({
            name: entry.name,
            displayName: only.file.name,
            meta: await readMetadata(only.file, only.file.name),
            thumbnailRef: entry.refs?.thumbnail,
            iconRef: entry.refs?.icon,
            version: fileVersion(entry),
          });
        }
      }
    } finally {
      this.#busy = undefined;
      if (this.#items.length) {
        this.#finished = true;
        this.#hide = setTimeout(() => {
          this.dismissList();
        }, UPLOADED_SHOWN_S * 1000);
      }
    }
  }
}

export const uploads = new Uploads();
