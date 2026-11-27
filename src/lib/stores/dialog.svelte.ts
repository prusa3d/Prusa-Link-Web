import { api } from '../api/client';
import type { components } from '../api/schema';

export type PrinterDialog = components['schemas']['Dialog'];

type Fetch = () => Promise<PrinterDialog | undefined>;
type Press = (id: number, button: string) => Promise<boolean>;

const fetchDialog: Fetch = async () => {
  const { data, response } = await api.GET('/api/v1/dialog');
  return response.status === 200 ? data : undefined;
};

const pressButton: Press = async (id, button) =>
  (
    await api.POST('/api/v1/dialog/{dialog_id}', {
      params: { path: { dialog_id: id } },
      body: { button },
    })
  ).response.ok;

/// Fetched for the red screen, which firmware in error mode reports
/// without a dialog id.
const RED_SCREEN = -1;

/// The dialog on the printer's screen (PrusaLink 2), fetched only when the
/// status's `dialog_id` changes. Read-only from outside by design.
export class DialogStore {
  #dialog = $state<PrinterDialog | undefined>();
  #pressing = $state<string | undefined>();
  #for: number | undefined;
  #fetch: Fetch;
  #press: Press;

  constructor(fetch: Fetch = fetchDialog, press: Press = pressButton) {
    this.#fetch = fetch;
    this.#press = press;
  }

  get current() {
    return this.#dialog;
  }

  /// The button sent and not yet answered.
  get pressing() {
    return this.#pressing;
  }

  /// Fed every status: the dialog id, and the state for the red screen.
  async follow(id: number | undefined, state: string | undefined) {
    const want = id ?? (state === 'ERROR' ? RED_SCREEN : undefined);
    if (want === this.#for) return;
    this.#for = want;
    this.#dialog = want === undefined ? undefined : await this.#fetch();
  }

  async press(button: string): Promise<boolean> {
    const d = this.#dialog;
    if (!d || this.#pressing) return false;
    this.#pressing = button;
    try {
      const ok = await this.#press(d.dialog_id, button);
      if (ok && this.#dialog === d) this.#dialog = undefined;
      return ok;
    } finally {
      this.#pressing = undefined;
    }
  }
}

export const dialog = /* @__PURE__ */ new DialogStore();
