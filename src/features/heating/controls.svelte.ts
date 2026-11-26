import { api } from '../../lib/api/client';

/// Preheat and babysteps (PrusaLink 2). The printer decides when it takes
/// them: preheat only when idle, babysteps only while printing.
export class Controls {
  #filaments = $state<string[]>([]);
  #zOffset = $state(0);
  #busy = $state(false);

  /// The filament presets the printer knows, once asked for.
  get filaments(): readonly string[] {
    return this.#filaments;
  }

  /// Babysteps sent from this page during this print, in mm.
  get zOffset() {
    return this.#zOffset;
  }

  get busy() {
    return this.#busy;
  }

  async loadFilaments() {
    if (this.#filaments.length) return;
    const { data } = await api.GET('/api/v1/filaments');
    this.#filaments = data?.filaments.map((f) => f.name) ?? [];
  }

  /// Heats for `filament` (the bed and every tool that heats, or just
  /// `tool`), or cools down with null.
  preheat(filament: string | null, tool?: number) {
    return this.#send(() =>
      api.POST('/api/v1/printer/preheat', {
        body: { filament, ...(tool !== undefined && { tool }) },
      }),
    );
  }

  async babystep(delta: number) {
    const ok = await this.#send(() =>
      api.PUT('/api/v1/printer', { body: { z_offset_delta: delta } }),
    );
    if (ok) this.#zOffset = Math.round((this.#zOffset + delta) * 1000) / 1000;
    return ok;
  }

  /// A new print starts from the printer's own offset.
  forget() {
    this.#zOffset = 0;
  }

  async #send(request: () => Promise<{ response: Response }>) {
    this.#busy = true;
    try {
      return (await request()).response.ok;
    } finally {
      this.#busy = false;
    }
  }
}

export const controls = new Controls();
