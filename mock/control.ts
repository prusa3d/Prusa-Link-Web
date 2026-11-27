import {
  type MockDialog,
  type MockPrinter,
  PRINTER_CODE,
  type PrinterModel,
  type PrinterState,
} from './printer.ts';

import { seedFirmware } from './seed.ts';

// What the dev panel does to the mock printer, shared by the dev server
// (mock/vite-plugin.ts) and the in-browser demo (demo/), so no Node here.

/// Dialogs the dev panel can put on the printer's screen.
export const DIALOGS = {
  runout: {
    state: 'ATTENTION',
    code: '12301',
    title: 'FILAMENT RUNOUT',
    text: 'The filament sensor detected the end of the filament.',
    buttons: ['Continue', 'Unload'],
  },
  heaters: {
    state: 'ATTENTION',
    code: '17520',
    title: 'HEATING DISABLED',
    text: 'Heating was disabled after 30 minutes without activity.',
    buttons: ['Continue'],
  },
  thermal: {
    state: 'ERROR',
    code: '17201',
    title: 'THERMAL RUNAWAY',
    text: 'Check the heatbed heater and thermistor wiring for possible damage.',
    buttons: [],
  },
  bsod: {
    state: 'ERROR',
    title: 'BSOD',
    text: 'HardFault at 0x08012345',
    buttons: [],
  },
} as const satisfies Record<string, Omit<MockDialog, 'id'>>;

export interface MockPatch {
  /// Back to the seeded state of the current model.
  reset?: boolean;
  usb?: boolean;
  firmware?: string;
  /// Simulated seconds per real second.
  timeScale?: number;
  model?: PrinterModel;
  state?: PrinterState;
  startPrint?: string;
  tool?: {
    index: number;
    temp?: number;
    target?: number;
    material?: string;
    color?: string;
  };
  /// A toolchanger with no tool picked.
  parked?: boolean;
  /// The tool a toolchanger picks (0-based); null puts it back.
  pick?: number | null;
  /// An MMU3 on the printer (only where one fits).
  mmu?: boolean;
  bed?: { temp?: number; target?: number };
  /// The XL's enabled tools by dock, from 1 (`[1, 2, 4, 5]`); null: as seeded.
  docks?: number[] | null;
  /// Fan speeds in RPM.
  fans?: { hotend?: number; print?: number };
  /// What the printer asks on its screen; null clears it.
  question?: string | null;
  /// The printer stops answering (it lost Wi-Fi, or was switched off).
  offline?: boolean;
  /// A person at the printer during a filament change.
  filament?: 'removed' | 'inserted' | 'cancel';
  /// Seconds the printer takes to pause, resume or stop.
  transitionSeconds?: number;
  /// Today's firmware (false) or PrusaLink 2's API.
  apiV2?: boolean;
  chamber?: boolean;
  enclosure?: boolean;
  /// Puts a dialog on the printer's screen; null takes it away.
  dialog?: keyof typeof DIALOGS | null;
  /// A button pressed on the printer's own screen.
  press?: string;
  /// Puts release files for this and another printer in the USB root.
  firmwareFiles?: boolean;
  /// The printer's nozzle check (hw_checks in /info).
  nozzleCheck?: 'ignore' | 'warning' | 'abort';
  modelCheck?: 'ignore' | 'warning' | 'abort';
  /// Every tool's nozzle: hardened, high flow, high temperature.
  nozzle?: { hardened?: boolean; highFlow?: boolean; highTemp?: boolean };
  /// A check of the printer's the page does not make (a dock not
  /// calibrated, not enough filament…), added to its reports; null drops it.
  extraCheck?: {
    check: string;
    level: 'warning' | 'abort';
    tool?: string;
  } | null;
  /// Boots into the red screen (with a crash dump); null boots normally.
  redScreen?: { code?: string; title: string; text: string } | null;
  /// A crash dump from an earlier crash, the printer running normally.
  crashDump?: boolean;
  /// The print preview asks about calibrations before its checks.
  previewQuestion?: boolean;
}

export function applyPatch(printer: MockPrinter, patch: MockPatch) {
  if (patch.reset) printer.reset();
  if (patch.usb !== undefined) printer.usb = patch.usb;
  if (patch.firmware) printer.firmware = patch.firmware;
  if (patch.timeScale) printer.timeScale = patch.timeScale;
  // Only the models the mock has data for; another one would crash reset().
  if (patch.model && patch.model in PRINTER_CODE) printer.setModel(patch.model);
  if (patch.state) printer.state = patch.state;
  if (patch.startPrint) printer.startPrint(patch.startPrint);
  if (patch.tool) {
    const tool = printer.tools[patch.tool.index];
    if (tool) Object.assign(tool, patch.tool);
  }
  if (patch.parked !== undefined) printer.parked = patch.parked;
  if (patch.pick === null) printer.parked = true;
  else if (patch.pick !== undefined && printer.tools[patch.pick]) {
    printer.activeTool = patch.pick;
    printer.parked = false;
  }
  if (patch.mmu !== undefined) printer.mmu = patch.mmu && printer.takesMmu;
  if (patch.bed) Object.assign(printer.bed, patch.bed);
  if (patch.fans) Object.assign(printer.fans, patch.fans);
  if (patch.docks !== undefined) printer.setDocks(patch.docks);
  if (patch.question !== undefined) {
    printer.question = patch.question ?? undefined;
    if (patch.question === null) printer.dialog = undefined;
  }
  if (patch.apiV2 !== undefined) printer.apiV2 = patch.apiV2;
  if (patch.chamber !== undefined)
    printer.chamber = patch.chamber ? { temp: 24, target: 0 } : undefined;
  if (patch.enclosure !== undefined)
    printer.enclosure = patch.enclosure ? { temp: 26 } : undefined;
  if (patch.dialog === null) {
    printer.dialog = undefined;
    printer.state = printer.job ? 'PRINTING' : 'IDLE';
  } else if (patch.dialog) {
    printer.showDialog({
      ...DIALOGS[patch.dialog],
      buttons: [...DIALOGS[patch.dialog].buttons],
    });
  }
  if (patch.nozzleCheck) printer.nozzleCheck = patch.nozzleCheck;
  if (patch.modelCheck) printer.modelCheck = patch.modelCheck;
  if (patch.nozzle) Object.assign(printer.nozzle, patch.nozzle);
  if (patch.previewQuestion !== undefined)
    printer.previewQuestion = patch.previewQuestion;
  if (patch.redScreen !== undefined)
    printer.crash(patch.redScreen ?? undefined);
  if (patch.crashDump !== undefined)
    printer.crashDump = patch.crashDump
      ? { size: 262_667, exported: false }
      : undefined;
  if (patch.extraCheck !== undefined)
    printer.extraCheck = patch.extraCheck ?? undefined;
  if (patch.firmwareFiles)
    printer.firmwareUploads = seedFirmware(printer.model);
  if (patch.press && printer.dialog)
    printer.press(printer.dialog.id, patch.press);
  if (patch.offline !== undefined) printer.offline = patch.offline;
  if (patch.filament) printer.answer(patch.filament);
  if (patch.transitionSeconds !== undefined)
    printer.transitionSeconds = patch.transitionSeconds;
}

export function snapshot(printer: MockPrinter) {
  return {
    apiKey: printer.apiKey,
    timeScale: printer.timeScale,
    usb: printer.usb,
    firmware: printer.firmware,
    model: printer.model,
    parked: printer.parked,
    mmu: printer.mmu,
    docks: printer.docks,
    takesMmu: printer.takesMmu,
    state: printer.state,
    bed: printer.bed,
    tools: printer.tools,
    activeTool: printer.activeTool,
    files: printer.files,
    firmwareUploads: printer.firmwareUploads,
    job: printer.job,
    question: printer.question,
    filamentStep: printer.filamentStep,
    apiV2: printer.apiV2,
    chamber: printer.chamber,
    enclosure: printer.enclosure,
    dialog: printer.dialog,
    objects: printer.job?.objects.map((o) => ({
      name: o.name,
      canceled: o.canceled,
    })),
    currentObject: printer.currentObject,
    zOffset: printer.zOffset,
    nozzleCheck: printer.nozzleCheck,
    nozzle: printer.nozzle,
    mapping: printer.job?.mapping,
    crashDump: printer.crashDump,
    logToFile: printer.logToFile,
    speed: printer.speed,
    flow: printer.flow,
    axis: printer.axis,
  };
}
