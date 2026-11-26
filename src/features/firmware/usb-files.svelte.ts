import { api } from '../../lib/api/client';

/// A firmware file in the USB root, with what PrusaLink 2 reads from its
/// header.
export interface UsbFirmware {
  name: string;
  displayName: string;
  version?: string | undefined;
  /// Against the installed firmware.
  relation?: 'newer' | 'same' | 'older' | undefined;
  compatible?: boolean | undefined;
}

/// What a flash ended with: started (the printer restarts), refused as not
/// newer, for another printer, or the printer busy.
export type Flash = 'started' | 'notNewer' | 'otherPrinter' | 'busy';

/// Firmware on the USB drive, and flashing a newer one (PrusaLink 2): the
/// printer installs newer versions only; downgrades stay a printer menu
/// action.
export class UsbFirmwareStore {
  #files = $state<UsbFirmware[]>([]);
  #flashing = $state<string | undefined>();

  get files(): readonly UsbFirmware[] {
    return this.#files;
  }

  /// The file being flashed; the printer restarts with it.
  get flashing() {
    return this.#flashing;
  }

  async refresh() {
    const { data } = await api.GET('/api/v1/files/{storage}/{path}', {
      params: { path: { storage: 'usb', path: '' } },
    });
    const children =
      (
        data as
          | {
              children?: {
                type: string;
                name: string;
                display_name?: string;
              }[];
            }
          | undefined
      )?.children ?? [];
    const found: UsbFirmware[] = [];
    for (const c of children.filter((c) => c.type === 'FIRMWARE')) {
      const { data: detail } = await api.GET('/api/v1/files/{storage}/{path}', {
        params: { path: { storage: 'usb', path: c.name } },
      });
      const meta = (
        detail as
          | {
              meta?: {
                version?: string;
                relation?: UsbFirmware['relation'];
                compatible?: boolean;
              };
            }
          | undefined
      )?.meta;
      found.push({
        name: c.name,
        displayName: c.display_name ?? c.name,
        version: meta?.version,
        relation: meta?.relation,
        compatible: meta?.compatible,
      });
    }
    this.#files = found;
  }

  async flash(file: UsbFirmware): Promise<Flash> {
    this.#flashing = file.name;
    const { response, error } = await api.POST(
      '/api/v1/files/{storage}/{path}',
      { params: { path: { storage: 'usb', path: file.name } } },
    );
    if (response.status === 202) return 'started';
    this.#flashing = undefined;
    if (response.status === 422) return 'otherPrinter';
    return (error as { reason?: string } | undefined)?.reason === 'not_newer'
      ? 'notNewer'
      : 'busy';
  }
}

export const usbFirmware = new UsbFirmwareStore();
