import { api } from '../api/client';
import { modelOf, printerTitle, type Model } from '../printer/models';
import { rememberVariant } from '../printer/picture';

type FetchIdentity = () => Promise<{
  code?: string | undefined;
  hostname?: string | undefined;
  firmware?: string | undefined;
  nozzle?: number | undefined;
}>;

const fetchIdentity: FetchIdentity = async () => {
  const [version, info] = await Promise.all([
    api.GET('/api/version'),
    api.GET('/api/v1/info'),
  ]);
  return {
    code: version.data?.printer,
    hostname: info.data?.hostname,
    firmware: version.data?.firmware,
    nozzle: info.data?.nozzle_diameter,
  };
};

/// Which printer this is: its model from /api/version and the hostname set on
/// it (Settings > Network). Read-only by design: the printer owns it.
export class IdentityStore {
  #model = $state<Model | undefined>();
  #hostname = $state<string | undefined>();
  #firmware = $state<string | undefined>();
  #nozzle = $state<number | undefined>();
  #fetch: FetchIdentity;

  constructor(fetch: FetchIdentity = fetchIdentity) {
    this.#fetch = fetch;
  }

  get model() {
    return this.#model;
  }

  get hostname() {
    return this.#hostname;
  }

  /// The firmware version, e.g. `8.0.2+17092`.
  get firmware() {
    return this.#firmware;
  }

  /// The nozzle diameter in mm, as set on the printer.
  get nozzle() {
    return this.#nozzle;
  }

  get title() {
    return printerTitle(this.#hostname, this.#model);
  }

  async refresh() {
    try {
      const { code, hostname, firmware, nozzle } = await this.#fetch();
      this.#firmware = firmware;
      this.#nozzle = nozzle;
      this.#model = modelOf(code);
      if (this.#model) rememberVariant(this.#model.variant);
      this.#hostname = hostname === '' ? undefined : hostname;
    } catch {
      // Keeps what it knew; the status poll reports the printer offline.
    }
  }

  /// Refreshes now, every 30 s (a firmware update or a renamed printer shows
  /// without a reload) and on a `prusalink:identity` event, which the dev
  /// server's mock printer sends when its model changes.
  poll(intervalMs = 30_000): () => void {
    const refresh = () => {
      void this.refresh();
    };
    refresh();
    const id = setInterval(refresh, intervalMs);
    globalThis.addEventListener('prusalink:identity', refresh);
    return () => {
      clearInterval(id);
      globalThis.removeEventListener('prusalink:identity', refresh);
    };
  }
}

export const identity = new IdentityStore();
