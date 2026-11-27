import { api } from '../../lib/api/client';
import { identity } from '../../lib/stores/identity.svelte';

/// Files earlier pages put on the USB drive to change filament with a
/// G-code job, `prusalink-filament-<id>.gcode`: hidden in the file list,
/// and such a job is not shown as a print.
const HELPER_PREFIX = 'prusalink-filament';

export const isHelper = (name: string | undefined) =>
  !!name?.startsWith(HELPER_PREFIX);

export type FilamentAction = 'load' | 'unload' | 'change';

export interface Outcome {
  /// The filament asked for; undefined for an unload.
  wanted: string | undefined;
  ok: boolean;
}

/// The loaded filament, and loading, changing or unloading it from the
/// browser (/api/v1/tools/{tool}/filament). The printer heats and guides the
/// person on its screen; only on an idle printer.
export class Filament {
  #busy = $state<FilamentAction | undefined>();
  #target = $state<string | undefined>();
  #outcome = $state<Outcome | undefined>();
  #seenRunning = false;
  #tool = $state(0);

  /// The tool the dialog loads, 0-based; PrusaLink 2 loads any tool.
  get tool() {
    return this.#tool;
  }

  set tool(index: number) {
    this.#tool = index;
  }

  #ofTool() {
    const material = identity.tools[this.#tool]?.material;
    return material && material !== '---' ? material : undefined;
  }

  /// The active tool's filament; undefined when none is loaded or unknown.
  get loaded() {
    return this.#ofTool();
  }

  /// The command in flight; read-only from outside by design.
  get busy() {
    return this.#busy;
  }

  /// The filament being loaded.
  get target() {
    return this.#target;
  }

  /// How the last change ended, checked against what the printer reports
  /// afterwards: it can be cancelled on the printer, or end with nothing or
  /// another filament loaded.
  get outcome() {
    return this.#outcome;
  }

  clearOutcome() {
    this.#outcome = undefined;
  }

  /// The loaded materials are in /api/v1/info.
  refresh() {
    return identity.refresh();
  }

  async run(action: FilamentAction, material?: string): Promise<boolean> {
    if (this.#busy) return false;
    this.#busy = action;
    this.#outcome = undefined;
    this.#target = action === 'unload' ? undefined : material;
    this.#seenRunning = false;
    const { response } = await api.POST('/api/v1/tools/{tool}/filament', {
      params: { path: { tool: String(this.#tool) } },
      body: { command: action, ...(material && { filament: material }) },
    });
    if (!response.ok) this.#busy = undefined;
    return response.ok;
  }

  /// Fed every printer state: once the printer has worked on the command and
  /// is done, reads the filament again.
  async follow(state: string | undefined) {
    if (!this.#busy || !state) return;
    const running = ['PRINTING', 'BUSY', 'ATTENTION', 'PAUSED'].includes(state);
    if (running) {
      this.#seenRunning = true;
      return;
    }
    if (!this.#seenRunning) return;
    // Busy until the new filament is read, so nothing offers the old one in
    // between.
    this.#seenRunning = false;
    await this.refresh();
    const wanted = this.#target;
    this.#outcome = {
      wanted,
      ok:
        this.#busy === 'unload'
          ? this.loaded === undefined
          : this.loaded === wanted,
    };
    this.#busy = undefined;
    this.#target = undefined;
  }
}

export const filament = new Filament();
