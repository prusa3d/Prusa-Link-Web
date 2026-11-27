import { reason } from '../../lib/api/reason';
import { api } from '../../lib/api/client';
import { isHidden } from '../../lib/files/filter';
import { listings } from './crawl';
import { isHelper } from '../filament/filament.svelte';

export interface PrinterEntry {
  type: string;
  name: string;
  display_name?: string;
  m_timestamp?: number;
  size?: number;
  refs?: { icon?: string; thumbnail?: string };
}

type ListFolder = (path: string) => Promise<PrinterEntry[]>;
type UsbPresent = () => Promise<boolean>;

const usbPresent: UsbPresent = async () => {
  const { data } = await api.GET('/api/v1/storage');
  return (
    data?.storage_list?.some((s) => s.name === 'usb' && s.available) ?? true
  );
};

const listFolder: ListFolder = async (path) => {
  const { data, response } = await api.GET('/api/v1/files/{storage}/{path}', {
    params: { path: { storage: 'usb', path } },
  });
  if (!response.ok) throw new Error(`listing ${String(response.status)}`);
  return (data as { children?: PrinterEntry[] } | undefined)?.children ?? [];
};

export const label = (entry: PrinterEntry) => entry.display_name ?? entry.name;

/// The USB stick, one folder at a time. Hidden entries are never shown;
/// folders come first, then files newest first.
export interface Crumb {
  /// The printer's name for the folder (8.3 on FAT), which paths use.
  name: string;
  /// The long name people see.
  label: string;
}

/// A print start: 204 means the printer took it, and still checks it in
/// its print preview.
export interface Started {
  ok: boolean;
  status: number;
  /// The printer's reason for a refusal.
  message?: string | undefined;
}

export class FilesStore {
  #crumbs = $state<Crumb[]>([]);
  #entries = $state<PrinterEntry[]>([]);
  #loading = $state(true);
  #failed = $state(false);
  #noUsb = $state(false);
  #list: ListFolder;
  #usbPresent: UsbPresent;

  constructor(list: ListFolder = listFolder, usb: UsbPresent = usbPresent) {
    this.#list = list;
    this.#usbPresent = usb;
  }

  /// The listing failed because no USB drive is in the printer.
  get noUsb() {
    return this.#noUsb;
  }

  /// Read-only by design: change it with open(), up() and goTo().
  get path() {
    return this.#crumbs.map((c) => c.name).join('/');
  }

  /// The folders from the USB root down to the current one.
  get crumbs(): readonly Crumb[] {
    return this.#crumbs;
  }

  /// True until the folder's listing arrives.
  get loading() {
    return this.#loading;
  }

  /// The last listing failed: no USB stick, or the printer did not answer.
  get failed() {
    return this.#failed;
  }

  get folders() {
    return this.#entries
      .filter((e) => e.type === 'FOLDER')
      .sort((a, b) => label(a).localeCompare(label(b)));
  }

  /// Firmware (.bbf) in the root, which PrusaLink 2 lists, is not a print.
  get files() {
    return this.#entries
      .filter((e) => e.type !== 'FOLDER' && e.type !== 'FIRMWARE')
      .sort((a, b) => (b.m_timestamp ?? 0) - (a.m_timestamp ?? 0));
  }

  /// A folder's raw listing, for searching below the current folder.
  listing(dir: string): Promise<PrinterEntry[]> {
    return this.#list(dir);
  }

  async refresh() {
    listings.clear();
    try {
      const entries = await this.#list(this.path);
      this.#entries = entries.filter(
        (e) => !isHidden(label(e)) && !isHidden(e.name) && !isHelper(label(e)),
      );
      this.#failed = false;
      this.#noUsb = false;
    } catch {
      this.#failed = true;
      this.#noUsb = !(await this.#usbPresent().catch(() => true));
    } finally {
      this.#loading = false;
    }
  }

  async open(name: string, folderLabel = name) {
    this.#crumbs = [...this.#crumbs, { name, label: folderLabel }];
    this.#loading = true;
    await this.refresh();
  }

  async up() {
    await this.goTo(this.#crumbs.length - 1);
  }

  /// Back to the folder `depth` levels below the USB root (0 is the root).
  async goTo(depth: number) {
    this.#crumbs = this.#crumbs.slice(0, Math.max(0, depth));
    this.#loading = true;
    await this.refresh();
  }

  /// Deletes a file from `dir` (the current folder unless given) and lists the
  /// folder again; false when the printer refuses (it is being printed).
  async remove(name: string, dir = this.path): Promise<boolean> {
    const { response } = await api.DELETE('/api/v1/files/{storage}/{path}', {
      params: { path: { storage: 'usb', path: dir ? `${dir}/${name}` : name } },
    });
    await this.refresh();
    return response.ok;
  }

  /// Starts a print from `dir` (the current folder unless given); false when
  /// the printer refuses.
  /// Starts a print; a tool mapping (Connect's shape) starts it without the
  /// printer's own mapping screen.
  async print(
    name: string,
    dir = this.path,
    mapping?: Record<string, number[]>,
  ): Promise<Started> {
    const { response, error } = await api.POST(
      '/api/v1/files/{storage}/{path}',
      {
        params: {
          path: {
            storage: 'usb',
            path: dir ? `${dir}/${name}` : name,
          },
        },
        ...(mapping && { body: { tool_mapping: mapping } }),
      },
    );
    return {
      ok: response.ok,
      status: response.status,
      message: response.ok ? undefined : reason(error),
    };
  }
}

export const files = new FilesStore();
