import type { components } from '../src/lib/api/schema';
import { parseFileName } from '../src/lib/files/name.ts';
import { type PlateObject, readObjectsInfo } from '../src/lib/files/header.ts';
import { ambient, FILAMENTS, seedFiles, seedTools, shortName } from './seed.ts';

type Schemas = components['schemas'];
export type PrinterState = Schemas['StatusPrinter']['state'];

/// XL is the five-tool XL, XL_2 a two-tool one and XL_SINGLE the one-tool
/// XL: the same firmware and the same /api/version, so the page tells them
/// apart only by the tool count of API v2.
export type PrinterModel =
  'MK4S' | 'XL' | 'XL_2' | 'XL_SINGLE' | 'COREONE' | 'COREONE_INDX';

export interface MockTool {
  temp: number;
  target: number;
  material: string;
  color?: string | undefined;
}

/// What the printer shows on its screen and PrusaLink 2 bridges to
/// /api/v1/dialog. `kind` says what pressing a button does in the mock.
export interface MockDialog {
  id: number;
  state: 'ATTENTION' | 'ERROR';
  code?: string | undefined;
  title: string;
  text: string;
  buttons: string[];
  kind?: 'mismatch' | undefined;
}

export interface MockObject {
  name: string;
  polygon: PlateObject['polygon'];
  canceled: boolean;
}

/// The states Connect and PrusaLink 2 take a preheat, a filament load or a
/// firmware flash in.
export const IDLE_STATES: readonly PrinterState[] = [
  'IDLE',
  'READY',
  'FINISHED',
  'STOPPED',
];

export interface MockFile {
  /// Folder on the stick, '' for the root, 'a/b' for nested ones.
  dir: string;
  name: string;
  display_name: string;
  size: number;
  m_timestamp: number;
  /// Seconds, as the slicer estimated.
  print_time: number;
  /// The text of a small upload (a helper job's G-code).
  gcode?: string;
  /// The bytes of an upload, or of a fixture the dev server or demo loaded,
  /// for downloads.
  data?: Uint8Array;
  /// A file in mock/fixtures that `MockPrinter.fixtures` holds.
  fixture?: string;
}

/// Where a filament change is: heating, waiting for the old filament to come
/// out or the new one to go in, then purging.
export type FilamentStep = 'heating' | 'remove' | 'insert' | 'purging';

export interface MockJob {
  id: number;
  file: MockFile;
  progress: number;
  time_printing: number;
  time_remaining: number;
  /// From the file's objects_info, once read; empty without one.
  objects: MockObject[];
}

/// The `printer` field of /api/version (src/lib/printer/models.ts).
export const PRINTER_CODE: Record<PrinterModel, string> = {
  MK4S: '1.4.1',
  XL: '3.1.0',
  XL_2: '3.1.0',
  XL_SINGLE: '3.1.0',
  COREONE: '7.1.0',
  COREONE_INDX: '7.10.0',
};

const HOSTNAME: Record<PrinterModel, string> = {
  MK4S: 'prusa-mk4s',
  XL: 'prusa-xl',
  XL_2: 'prusa-xl',
  XL_SINGLE: 'prusa-xl',
  COREONE: 'prusa-core-one',
  COREONE_INDX: 'prusa-core-one-indx',
};

/// The printer the dev server pretends to be. The dev panel edits it through
/// /__mock/*; the REST handlers read it. Time advances on `tick()`.
export class MockPrinter {
  /// Simulated seconds per real second, so a demo print visibly progresses.
  timeScale = 20;
  /// One release behind the latest, so the demo shows the update notice.
  firmware = '8.0.1';
  /// Whether a USB stick is in the printer.
  usb = true;
  /// Answers nothing, like a printer off the network.
  offline = false;
  /// The PrusaLink password; the dev panel shows it.
  apiKey = 'mockapikey12345';
  model: PrinterModel = 'MK4S';
  state: PrinterState = 'IDLE';
  bed = { temp: 22, target: 0 };
  tools: MockTool[] = [];
  activeTool = 0;
  /// No tool picked: a toolchanger parks them all when idle, and PrusaLink
  /// then reports no material (FilamentType::for_tool(NoTool) in Buddy).
  parked = false;
  /// An MMU3 attached and turned on (/api/v1/info `mmu`). Kept across a model
  /// switch only where the model can carry one.
  mmu = false;
  axis = { x: 0, y: 0, z: 0 };
  speed = 100;
  flow = 100;
  fanPrint = 0;
  /// Babysteps of this print, in mm.
  zOffset = 0;
  /// Answers the PrusaLink 2 API (/api/v1/info features, expanded status,
  /// dialogs, objects, tune, preheat, filament, firmware flash). Off, it is
  /// today's firmware.
  apiV2 = true;
  /// The CORE One's chamber; null without one.
  chamber: { temp: number; target: number } | undefined;
  /// The XL's enclosure.
  enclosure: { temp: number } | undefined;
  dialog: MockDialog | undefined;
  #nextDialogId = 1;
  /// Changes whenever an object is cancelled or the list changes.
  objectsRevision = 0;
  files: MockFile[] = [];
  /// Firmware (.bbf) in the USB root, by its long name. Firmware before API v2
  /// does not list them.
  firmwareUploads: string[] = [];
  /// Fixture bytes by name, which the dev server or demo loads.
  static fixtures: Record<string, Uint8Array> = {};
  /// Seconds until a printer flashing firmware answers again.
  #rebooting = 0;
  /// A filament command of API v2 the printer works on.
  #toolOp:
    | {
        tool: number;
        material: string;
        color?: string | undefined;
        ticks: number;
        back: PrinterState;
      }
    | undefined;
  /// A filament helper job (M701/M702) and the step it is at. Like the real
  /// printer it waits for a person: the dev panel's buttons take the filament
  /// out, put it in, or cancel.
  #helper:
    | {
        step: FilamentStep;
        material: string;
        unload: boolean;
        load: boolean;
        ticks: number;
      }
    | undefined;
  /// What the printer asks on its screen in ATTENTION (status_printer.message).
  question: string | undefined;
  /// Folders with nothing printable in them, such as the ones an OS leaves.
  folders: string[] = [];
  job: MockJob | undefined;
  #nextJobId = 1;

  constructor(model: PrinterModel = 'MK4S') {
    this.setModel(model);
  }

  /// Switches model and puts the printer in its seeded state: idle, cold, and
  /// a USB stick of files sliced for that model.
  setModel(model: PrinterModel) {
    this.model = model;
    this.reset();
  }

  reset() {
    this.usb = true;
    this.offline = false;
    this.#transition = undefined;
    this.question = undefined;
    this.state = 'IDLE';
    this.job = undefined;
    this.bed = { temp: ambient(9), target: 0 };
    this.tools = seedTools(this.model);
    this.activeTool = 0;
    this.parked = this.model === 'XL' || this.model === 'XL_2';
    this.chamber = this.model.startsWith('COREONE')
      ? { temp: ambient(3), target: 0 }
      : undefined;
    this.enclosure = undefined;
    this.dialog = undefined;
    this.#toolOp = undefined;
    this.#rebooting = 0;
    this.fanPrint = 0;
    this.zOffset = 0;
    if (!this.takesMmu) this.mmu = false;
    this.axis = { x: 0, y: -4, z: 5 };
    this.speed = 100;
    this.flow = 100;
    const seeded = seedFiles(this.model);
    this.files = seeded.files;
    this.folders = seeded.folders;
    this.firmwareUploads = [];
  }

  get toolCount() {
    return this.tools.length;
  }

  /// The bytes a download of `f` answers with, when the mock has them.
  bytes(f: MockFile): Uint8Array | undefined {
    return f.data ?? (f.fixture ? MockPrinter.fixtures[f.fixture] : undefined);
  }

  /// Shows a dialog on the printer's screen, with a new id.
  showDialog(d: Omit<MockDialog, 'id'>) {
    this.dialog = { ...d, id: this.#nextDialogId++ };
    this.state = d.state;
  }

  /// A button pressed on the printer's dialog, from its screen or the API.
  press(id: number, button: string): 'ok' | 'stale' | 'invalid' {
    const d = this.dialog;
    if (d?.id !== id) return 'stale';
    if (!d.buttons.includes(button)) return 'invalid';
    this.dialog = undefined;
    this.question = undefined;
    if (d.kind === 'mismatch' && button === 'Abort') {
      this.state = 'STOPPED';
      this.cool();
    } else {
      this.state = this.job ? 'PRINTING' : 'IDLE';
    }
    return 'ok';
  }

  get rebooting() {
    return this.#rebooting > 0;
  }

  /// Flashes the firmware and restarts: it answers nothing for a few seconds.
  flash(version: string) {
    this.firmware = version;
    this.#rebooting = 6;
    this.offline = true;
  }

  /// A filament load, change or unload by API v2; `material` '---' unloads.
  toolFilament(tool: number, material: string, color?: string) {
    this.#toolOp = { tool, material, color, ticks: 4, back: this.state };
    const t = this.tools[tool];
    if (t) t.target = 230;
    if (IDLE_STATES.includes(this.state)) this.state = 'BUSY';
  }

  /// Heats for a filament, or cools down with undefined.
  preheat(name: string | undefined, tool?: number) {
    const preset = FILAMENTS.find((f) => f.name === name);
    if (!preset) {
      this.cool();
      return;
    }
    this.tools.forEach((t, i) => {
      if (tool === undefined || tool === i) t.target = preset.nozzle;
    });
    this.bed.target = preset.bed;
    if (this.chamber && preset.chamber) this.chamber.target = preset.chamber;
  }

  /// The object the head is on: it moves through the objects left as the
  /// print goes on.
  get currentObject(): number | undefined {
    const job = this.job;
    if (!job) return undefined;
    const left = job.objects
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => !o.canceled);
    if (!left.length) return undefined;
    const layer = Math.floor(job.time_printing / 30);
    return left[layer % left.length]?.i;
  }

  setCanceled(id: number, canceled: boolean): boolean {
    const o = this.job?.objects[id];
    if (!o) return false;
    o.canceled = canceled;
    this.objectsRevision++;
    return true;
  }

  async #readObjects(job: MockJob) {
    const bytes = this.bytes(job.file);
    if (!bytes) return;
    const objects = await readObjectsInfo(new Blob([bytes.slice()]).stream());
    if (this.job !== job || !objects) return;
    job.objects = objects.map((o) => ({ ...o, canceled: false }));
    this.objectsRevision++;
  }

  get activeToolState(): MockTool {
    const tool = this.tools[this.activeTool];
    if (!tool)
      throw new Error(`no tool ${String(this.activeTool)} on ${this.model}`);
    return tool;
  }

  /// The printers an MMU3 fits (MK4S, CORE One).
  get takesMmu() {
    return this.model === 'MK4S' || this.model === 'COREONE';
  }

  get hostname() {
    return HOSTNAME[this.model];
  }

  /// A file by its path on the stick, `dir/NAME~1.BGC`.
  file(path: string): MockFile | undefined {
    return this.files.find((f) => filePath(f) === path);
  }

  /// What a folder holds: its files and the folders directly under it.
  list(dir: string): { files: MockFile[]; folders: string[] } {
    const prefix = dir ? `${dir}/` : '';
    const sub = new Set<string>();
    for (const d of [...this.files.map((f) => f.dir), ...this.folders]) {
      if (d.startsWith(prefix) && d !== dir) {
        const next = d.slice(prefix.length).split('/')[0];
        if (next) sub.add(next);
      }
    }
    return {
      files: this.files.filter((f) => f.dir === dir),
      folders: [...sub].sort(),
    };
  }

  startPrint(path: string): boolean {
    const f = this.file(path);
    if (!f || this.state === 'PRINTING' || this.state === 'PAUSED') {
      return false;
    }
    this.job = {
      id: this.#nextJobId++,
      file: f,
      progress: 0,
      time_printing: 0,
      time_remaining: f.print_time,
      objects: [],
    };
    this.zOffset = 0;
    this.objectsRevision++;
    void this.#readObjects(this.job);
    // A filament helper job (M701/M702): heats, swaps, finishes.
    const load = /M701 S"([A-Z]+)"/.exec(f.gcode ?? '');
    if (load || f.gcode?.includes('M702')) {
      this.state = 'BUSY';
      this.activeToolState.target = 230;
      this.#helper = {
        step: 'heating',
        material: load?.[1] ?? '---',
        unload: f.gcode?.includes('M702') ?? false,
        load: !!load,
        ticks: 0,
      };
      return true;
    }
    this.bed.target = 60;
    this.activeToolState.target = 215;
    // Like the firmware's print preview: a file for another filament than the
    // loaded one stops for a question on the printer's screen.
    const wanted = new Set(parseFileName(f.display_name).materials);
    const loaded = this.activeToolState.material.toUpperCase();
    if (wanted.size === 1 && !wanted.has(loaded)) {
      this.question = `Filament mismatch: the file is for ${[...wanted].join('')}, ${loaded} is loaded.`;
      this.showDialog({
        state: 'ATTENTION',
        code: '12608',
        title: 'FILAMENT MISMATCH',
        text: this.question,
        buttons: ['Print', 'Abort'],
        kind: 'mismatch',
      });
    } else {
      this.state = 'PRINTING';
      this.question = undefined;
    }
    return true;
  }

  /// Like the real printer, pause, resume and stop take a few seconds: it
  /// finishes the move, parks or unparks the head, then reports the state.
  /// Seconds of real time, whatever the print speed.
  transitionSeconds = 4;
  #transition: { to: PrinterState; ticks: number } | undefined;

  stop() {
    if (this.job)
      this.#transition = { to: 'STOPPED', ticks: this.transitionSeconds };
  }

  pause() {
    if (this.state === 'PRINTING')
      this.#transition = { to: 'PAUSED', ticks: this.transitionSeconds };
  }

  resume() {
    if (this.state === 'PAUSED')
      this.#transition = { to: 'PRINTING', ticks: this.transitionSeconds };
  }

  #settle() {
    const t = this.#transition;
    if (!t || --t.ticks > 0) return;
    this.#transition = undefined;
    this.state = t.to;
    if (t.to === 'STOPPED') this.cool();
  }

  /// Stores an upload under its 8.3 name and returns its path.
  upload(
    path: string,
    size: number,
    gcode?: string,
    data?: Uint8Array,
  ): string {
    const slash = path.lastIndexOf('/');
    const dir = slash < 0 ? '' : path.slice(0, slash);
    const displayName = path.slice(slash + 1);
    this.files = this.files.filter(
      (f) => !(f.dir === dir && f.display_name === displayName),
    );
    const taken = new Set(
      this.files.filter((f) => f.dir === dir).map((f) => f.name),
    );
    const name = shortName(displayName, taken);
    this.files.unshift({
      dir,
      name,
      display_name: displayName,
      size,
      m_timestamp: Math.floor(Date.now() / 1000),
      print_time: 45 * 60,
      ...(gcode !== undefined && { gcode }),
      ...(data && { data }),
    });
    return dir ? `${dir}/${name}` : name;
  }

  delete(path: string): boolean {
    const f = this.file(path);
    if (!f || (this.job?.file === f && this.state === 'PRINTING')) return false;
    this.files = this.files.filter((x) => x !== f);
    return true;
  }

  /// The step a filament change waits at, for the dev panel.
  get filamentStep(): FilamentStep | undefined {
    return this.#helper?.step;
  }

  /// What a person does at the printer during a filament change.
  answer(action: 'removed' | 'inserted' | 'cancel') {
    const helper = this.#helper;
    if (!helper) return;
    if (action === 'cancel') {
      // Cancelled after the old filament came out: nothing is loaded.
      if (helper.step === 'insert' && helper.unload)
        this.activeToolState.material = '---';
      this.#endHelper('STOPPED');
    } else if (action === 'removed' && helper.step === 'remove') {
      if (helper.load) this.#ask('insert');
      else {
        this.activeToolState.material = '---';
        this.#endHelper('FINISHED');
      }
    } else if (action === 'inserted' && helper.step === 'insert') {
      helper.step = 'purging';
      helper.ticks = 0;
      this.state = 'BUSY';
      this.question = undefined;
    }
  }

  #ask(step: 'remove' | 'insert') {
    if (!this.#helper) return;
    this.#helper.step = step;
    this.state = 'ATTENTION';
    this.question =
      step === 'remove'
        ? 'Remove the filament from the extruder.'
        : `Insert ${this.#helper.material} into the extruder.`;
  }

  #endHelper(state: PrinterState) {
    this.#helper = undefined;
    this.job = undefined;
    this.question = undefined;
    this.state = state;
    this.cool();
  }

  /// One real second.
  tick() {
    if (this.#rebooting > 0 && --this.#rebooting === 0) {
      this.offline = false;
      this.state = 'IDLE';
      this.job = undefined;
    }
    this.#settle();
    const op = this.#toolOp;
    if (op && --op.ticks <= 0) {
      const t = this.tools[op.tool];
      if (t) {
        t.material = op.material;
        t.color = op.material === '---' ? undefined : op.color;
        t.target = 0;
      }
      this.#toolOp = undefined;
      if (this.state === 'BUSY') this.state = op.back;
    }
    // Stopped on the printer (the dev panel's state buttons): the filament
    // stays as it was.
    if (this.#helper && !['BUSY', 'ATTENTION'].includes(this.state)) {
      this.#helper = undefined;
      this.job = undefined;
    }
    const helper = this.#helper;
    // A few seconds of heating, then the printer asks for the person.
    if (helper?.step === 'heating' && ++helper.ticks >= 4) {
      helper.ticks = 0;
      this.#ask(helper.unload ? 'remove' : 'insert');
    } else if (helper?.step === 'purging' && ++helper.ticks >= 3) {
      this.activeToolState.material = helper.material;
      this.#endHelper('FINISHED');
    }
    const approach = (t: { temp: number; target: number }, i: number) => {
      const goal = t.target > 0 ? t.target : ambient(i);
      const step =
        Math.sign(goal - t.temp) * Math.min(Math.abs(goal - t.temp), 4);
      t.temp = Math.round((t.temp + step) * 10) / 10;
    };
    approach(this.bed, 9);
    this.tools.forEach(approach);
    if (this.chamber) approach(this.chamber, 3);
    const current = this.currentObject;
    const polygon =
      current === undefined ? undefined : this.job?.objects[current]?.polygon;
    if (this.state === 'PRINTING' && polygon?.length) {
      const [x, y] = polygon[
        (this.job?.time_printing ?? 0) % polygon.length
      ] ?? [0, 0];
      this.axis.x = Math.round(x * 100) / 100;
      this.axis.y = Math.round(y * 100) / 100;
    }
    if (this.state === 'PRINTING' && this.job) {
      const total = this.job.time_printing + this.job.time_remaining;
      const dt = Math.min(this.timeScale, this.job.time_remaining);
      this.job.time_printing += dt;
      this.job.time_remaining -= dt;
      this.job.progress = total ? (this.job.time_printing / total) * 100 : 100;
      if (this.job.time_remaining === 0) {
        this.state = 'FINISHED';
        this.cool();
      }
    }
  }

  cool() {
    this.bed.target = 0;
    this.tools.forEach((t) => (t.target = 0));
    if (this.chamber) this.chamber.target = 0;
  }
}

export function filePath(f: MockFile): string {
  return f.dir ? `${f.dir}/${f.name}` : f.name;
}
