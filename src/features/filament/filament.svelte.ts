import { api } from '../../lib/api/client';
import { loadedMaterial } from '../../lib/api/legacy';
import { uploadToUsb } from '../../lib/api/upload';
import type { Variant } from '../../lib/printer/models';
import { identity } from '../../lib/stores/identity.svelte';

/// The helper jobs' files on the USB drive, `prusalink-filament-<id>.gcode`:
/// a new name each time, so an upload never replaces one still in use or
/// left behind, and the printer never shows an old job's details for it.
/// The file list hides them, and such a job is not shown as a print.
const HELPER_PREFIX = 'prusalink-filament';

export const isHelper = (name: string | undefined) =>
  !!name?.startsWith(HELPER_PREFIX);

export type FilamentAction = 'load' | 'unload' | 'change';

export interface Outcome {
  /// The filament asked for; undefined for an unload.
  wanted: string | undefined;
  ok: boolean;
}

/// The M862.6 features the firmware wants a file to declare before it runs
/// it without asking on its screen (GCodeInfo and CompatibilityReport in
/// Buddy): every printer but the iX checks for Input Shaper, the INDX also
/// for its lock. A feature a printer does not know is itself a failed check,
/// so each printer gets only its own.
export function helperFeatures(variant: Variant | undefined): string[] {
  if (variant === 'ix') return [];
  if (variant === 'coreone_indx' || variant === 'coreonel_indx')
    return ['Input Shaper', 'INDX lock'];
  return ['Input Shaper'];
}

/// G-code for each action, by the firmware's own commands (M701 loads and
/// sets the type, M702 unloads). The printer heats up and guides the person
/// on its screen.
export function helperGcode(
  action: FilamentAction,
  material?: string,
  variant?: Variant,
): string {
  const load = `M701 S"${material ?? 'PLA'}"`;
  const lines = { load: [load], unload: ['M702'], change: ['M702', load] }[
    action
  ];
  return [
    '; PrusaLink filament helper',
    ...helperFeatures(variant).map((f) => `M862.6 P "${f}"`),
    ...lines,
    '',
  ].join('\n');
}

/// The loaded filament, and loading, changing or unloading it from the
/// browser. The printer heats and guides the person on its screen; only on
/// an idle printer.
///
/// PrusaLink 2 takes the command (/api/v1/tools/{tool}/filament) and lists
/// the loaded filaments in /api/v1/info. Before it, the API has no filament
/// command: the G-code runs as a short print job (upload the helper file,
/// start it, delete it when the printer is done), and the active tool's
/// filament comes from /api/printer.
export class Filament {
  #legacy = $state<string | undefined>();
  #busy = $state<FilamentAction | undefined>();
  #target = $state<string | undefined>();
  #outcome = $state<Outcome | undefined>();
  #helper: string | undefined;
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
    return __API_V2__ ? this.#ofTool() : this.#legacy;
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

  async refresh() {
    if (__API_V2__) await identity.refresh();
    else this.#legacy = await loadedMaterial();
  }

  /// Polls the loaded filament every 10 s where /api/v1/info does not tell
  /// when it changes: it changes rarely, and the printer is slow to ask.
  poll(intervalMs = 10_000): () => void {
    if (__API_V2__) return () => undefined;
    let waiting = false;
    const tick = () => {
      if (waiting) return;
      waiting = true;
      void this.refresh().finally(() => {
        waiting = false;
      });
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      clearInterval(id);
    };
  }

  async run(action: FilamentAction, material?: string): Promise<boolean> {
    if (this.#busy) return false;
    this.#busy = action;
    this.#outcome = undefined;
    this.#target = action === 'unload' ? undefined : material;
    this.#seenRunning = false;
    const started = __API_V2__
      ? await this.#command(action, material)
      : await this.#helperJob(action, material);
    if (!started) this.#busy = undefined;
    return started;
  }

  async #command(action: FilamentAction, material?: string) {
    const { response } = await api.POST('/api/v1/tools/{tool}/filament', {
      params: { path: { tool: String(this.#tool) } },
      body: { command: action, ...(material && { filament: material }) },
    });
    return response.ok;
  }

  async #helperJob(action: FilamentAction, material?: string) {
    const name = `${HELPER_PREFIX}-${Date.now().toString(36)}.gcode`;
    const file = new File(
      [helperGcode(action, material, identity.model?.variant)],
      name,
    );
    if (!(await uploadToUsb(file, '', () => undefined))) return false;
    const { data } = await api.GET('/api/v1/files/{storage}/{path}', {
      params: { path: { storage: 'usb', path: '' } },
    });
    const children = (
      data as
        { children?: { name: string; display_name?: string }[] } | undefined
    )?.children;
    this.#helper = children?.find((c) => c.display_name === name)?.name;
    return (
      this.#helper !== undefined &&
      (
        await api.POST('/api/v1/files/{storage}/{path}', {
          params: { path: { storage: 'usb', path: this.#helper } },
        })
      ).response.ok
    );
  }

  /// Fed every printer state: once the printer has worked on the command and
  /// is done, deletes a helper job's file and reads the filament again.
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
    const helper = this.#helper;
    this.#helper = undefined;
    if (helper)
      await api.DELETE('/api/v1/files/{storage}/{path}', {
        params: { path: { storage: 'usb', path: helper } },
      });
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
