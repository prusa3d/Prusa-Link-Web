import type { components } from '../src/lib/api/schema';
import { parseFileName } from '../src/lib/files/name.ts';
import { ambient, seedFiles, seedTools, shortName } from './seed.ts';

type Schemas = components['schemas'];
export type PrinterState = Schemas['StatusPrinter']['state'];

/// XL is the five-tool XL, XL_SINGLE the one-tool XL: the same firmware and
/// the same /api/version, so the page cannot tell them apart.
export type PrinterModel =
  'MK4S' | 'XL' | 'XL_SINGLE' | 'COREONE' | 'COREONE_INDX';

export interface MockTool {
  temp: number;
  target: number;
  material: string;
}

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
}

/// The `printer` field of /api/version (src/lib/printer/models.ts).
export const PRINTER_CODE: Record<PrinterModel, string> = {
  MK4S: '1.4.1',
  XL: '3.1.0',
  XL_SINGLE: '3.1.0',
  COREONE: '7.1.0',
  COREONE_INDX: '7.10.0',
};

const HOSTNAME: Record<PrinterModel, string> = {
  MK4S: 'prusa-mk4s',
  XL: 'prusa-xl',
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
  axis = { x: 0, y: 0, z: 0 };
  speed = 100;
  flow = 100;
  files: MockFile[] = [];
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
    this.parked = this.model === 'XL';
    this.axis = { x: 0, y: -4, z: 5 };
    this.speed = 100;
    this.flow = 100;
    const seeded = seedFiles(this.model);
    this.files = seeded.files;
    this.folders = seeded.folders;
  }

  get activeToolState(): MockTool {
    const tool = this.tools[this.activeTool];
    if (!tool)
      throw new Error(`no tool ${String(this.activeTool)} on ${this.model}`);
    return tool;
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
    };
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
      this.state = 'ATTENTION';
      this.question = `Filament mismatch: the file is for ${[...wanted].join('')}, ${loaded} is loaded.`;
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
  upload(path: string, size: number, gcode?: string): string {
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
    this.#settle();
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
  }
}

export function filePath(f: MockFile): string {
  return f.dir ? `${f.dir}/${f.name}` : f.name;
}
