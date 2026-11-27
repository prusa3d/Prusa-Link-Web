import { api } from '../api/client';
import { modelOf, printerTitle, type Model } from '../printer/models';
import { rememberVariant } from '../printer/picture';
import type { components } from '../api/schema';
import { printerTools, type ToolEntry } from '../printer/printer-tools';
import type { PrinterTool, Severity } from '../printer/tool-mapping';

/// A tool as /api/v1/info describes it (PrusaLink 2); undefined for a
/// disabled one.
export interface ToolInfo {
  material?: string | undefined;
  /// `#rrggbb`.
  color?: string | undefined;
  /// mm.
  nozzle?: number | undefined;
  hardened?: boolean | undefined;
  highFlow?: boolean | undefined;
  highTemp?: boolean | undefined;
}

type Info = components['schemas']['Info'];

type FetchIdentity = () => Promise<{
  code?: string | undefined;
  hostname?: string | undefined;
  firmware?: string | undefined;
  nozzle?: number | undefined;
  mmu?: boolean | undefined;
  features?: string[] | undefined;
  tools?: (ToolInfo | undefined)[] | undefined;
  enclosure?: boolean | undefined;
  slots?: PrinterTool[] | undefined;
  nozzleCheck?: Severity | undefined;
  modelCheck?: Severity | undefined;
}>;

/// What tool mapping maps to: the MMU's slots (`"0.N"`) where the printer
/// reports them, else its tools; numbered from 1 as Connect's tool_mapping.
export function mappingTargets(info: Info | undefined): PrinterTool[] {
  const tree = printerTools(info?.tools);
  const mmu = tree.mmu();
  const target = (
    id: string,
    tool: ToolEntry | null,
    nozzleOf: ToolEntry | null,
  ) => {
    const material = tool?.material_package_instance?.package?.material;
    const features = nozzleOf?.features;
    const loaded = material?.abbreviation;
    return {
      id,
      index: Number(id.split('.').pop()) + 1,
      material: loaded && loaded !== '---' ? loaded : undefined,
      color: material?.primary_color?.color_rgba,
      nozzle: features?.nozzle_diameter,
      hardened: features?.nozzle_hardened,
      highFlow: features?.nozzle_high_flow,
      highTemp: features?.nozzle_high_temp,
      disabled: tool === null,
    };
  };
  if (mmu) return mmu.slots.map((s) => target(s.id, s.slot, mmu.head));
  return tree
    .tools()
    .map(({ toolId, tool }) => target(String(toolId), tool, tool));
}

/// Tools by index from the `"0"`, `"1"`… keys; MMU slots (`"0.N"`) are left
/// out.
export function toolsOf(info: Info | undefined): (ToolInfo | undefined)[] {
  const out: (ToolInfo | undefined)[] = [];
  for (const [key, tool] of Object.entries(info?.tools ?? {})) {
    if (!/^\d+$/.test(key)) continue;
    const material = tool?.material_package_instance?.package?.material;
    out[Number(key)] = tool
      ? {
          material: material?.abbreviation,
          color: material?.primary_color?.color_rgba,
          nozzle: tool.features?.nozzle_diameter,
          ...((__NOZZLE_BADGES__ || __TOOL_MAPPING__) && {
            hardened: tool.features?.nozzle_hardened,
            highFlow: tool.features?.nozzle_high_flow,
            highTemp: tool.features?.nozzle_high_temp,
          }),
        }
      : undefined;
  }
  return Array.from(
    { length: info?.tool_count ?? out.length },
    (_, i) => out[i],
  );
}

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
    mmu: info.data?.mmu,
    features: info.data?.features,
    tools: toolsOf(info.data),
    enclosure: info.data?.enclosure?.enabled,
    slots: __TOOL_MAPPING__ ? mappingTargets(info.data) : [],
    nozzleCheck: info.data?.hw_checks?.nozzle,
    modelCheck: info.data?.hw_checks?.model,
  };
};

/// Which printer this is: its model from /api/version and the hostname set on
/// it (Settings > Network). Read-only by design: the printer owns it.
export class IdentityStore {
  #model = $state<Model | undefined>();
  #hostname = $state<string | undefined>();
  #firmware = $state<string | undefined>();
  #nozzle = $state<number | undefined>();
  #mmu = $state(false);
  #features = $state<readonly string[] | undefined>();
  #tools = $state<(ToolInfo | undefined)[]>([]);
  #enclosure = $state(false);
  #code = $state<string | undefined>();
  #slots = $state<PrinterTool[]>([]);
  #nozzleCheck = $state<Severity | undefined>();
  #modelCheck = $state<Severity | undefined>();
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

  /// An MMU is attached and turned on.
  get mmu() {
    return this.#mmu;
  }

  /// One of /api/v1/info's `features`, such as `cancel_object`.
  can(feature: string) {
    return this.#features?.includes(feature) ?? false;
  }

  /// Every tool, as PrusaLink 2 reports them; empty before it.
  get tools(): readonly (ToolInfo | undefined)[] {
    return this.#tools;
  }

  /// The tools or MMU slots a print's extruders map to.
  get slots(): readonly PrinterTool[] {
    return this.#slots;
  }

  /// What the printer does with a file for another nozzle; firmware that
  /// does not say warns.
  get nozzleCheck(): Severity {
    return this.#nozzleCheck ?? 'warning';
  }

  /// What the printer does with a file sliced for another printer.
  get modelCheck(): Severity {
    return this.#modelCheck ?? 'warning';
  }

  /// The `printer` code of /api/version, e.g. `1.4.1`.
  get code() {
    return this.#code;
  }

  get enclosure() {
    return this.#enclosure;
  }

  get title() {
    return printerTitle(this.#hostname, this.#model);
  }

  async refresh() {
    try {
      const {
        code,
        hostname,
        firmware,
        nozzle,
        mmu,
        features,
        tools,
        enclosure,
        slots,
        nozzleCheck,
        modelCheck,
      } = await this.#fetch();
      this.#modelCheck = modelCheck;
      this.#slots = slots ?? [];
      this.#nozzleCheck = nozzleCheck;
      this.#mmu = mmu ?? false;
      this.#features = features;
      this.#tools = tools ?? [];
      this.#enclosure = enclosure ?? false;
      this.#firmware = firmware;
      this.#nozzle = nozzle;
      this.#code = code;
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
