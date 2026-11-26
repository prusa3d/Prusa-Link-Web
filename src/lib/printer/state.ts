import type { components } from '../api/schema';
import type { Tone } from '../ui/badge';

export type PrinterState = components['schemas']['StatusPrinter']['state'];

/// How a state reads at a glance, on Prusa Connect's state colours: calm grey
/// when nothing happens, green when ready or done, blue while working, yellow
/// when it waits for someone, red on a fault.
export const STATE_TONE: Record<PrinterState, Tone> = {
  IDLE: 'quiet',
  READY: 'done',
  BUSY: 'active',
  PRINTING: 'active',
  PAUSED: 'attention',
  ATTENTION: 'attention',
  STOPPED: 'attention',
  FINISHED: 'done',
  ERROR: 'fault',
};

/// The edge colour of a card in that state.
export const STATE_EDGE: Record<Tone, string> = {
  active: 'border-l-state-active-edge',
  done: 'border-l-state-done-edge',
  attention: 'border-l-state-attention-edge',
  fault: 'border-l-state-fault-edge',
  quiet: 'border-l-state-quiet-edge',
};

/// The progress bar's fill in that state.
export const STATE_FILL: Record<Tone, string> = {
  active: 'bg-progress',
  done: 'bg-state-done-edge',
  attention: 'bg-state-attention-edge',
  fault: 'bg-state-fault-edge',
  quiet: 'bg-progress',
};

/// States in which the printer takes a new print.
export const CAN_START: ReadonlySet<PrinterState> = new Set([
  'IDLE',
  'READY',
  'FINISHED',
  'STOPPED',
]);
