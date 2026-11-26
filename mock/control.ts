import {
  type MockPrinter,
  PRINTER_CODE,
  type PrinterModel,
  type PrinterState,
} from './printer.ts';

// What the dev panel does to the mock printer, shared by the dev server
// (mock/vite-plugin.ts) and the in-browser demo (demo/), so no Node here.

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
  tool?: { index: number; temp?: number; target?: number; material?: string };
  /// A toolchanger with no tool picked.
  parked?: boolean;
  bed?: { temp?: number; target?: number };
  /// What the printer asks on its screen; null clears it.
  question?: string | null;
  /// The printer stops answering (it lost Wi-Fi, or was switched off).
  offline?: boolean;
  /// A person at the printer during a filament change.
  filament?: 'removed' | 'inserted' | 'cancel';
  /// Seconds the printer takes to pause, resume or stop.
  transitionSeconds?: number;
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
  if (patch.bed) Object.assign(printer.bed, patch.bed);
  if (patch.question !== undefined)
    printer.question = patch.question ?? undefined;
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
    state: printer.state,
    bed: printer.bed,
    tools: printer.tools,
    activeTool: printer.activeTool,
    files: printer.files,
    job: printer.job,
    question: printer.question,
    filamentStep: printer.filamentStep,
  };
}
