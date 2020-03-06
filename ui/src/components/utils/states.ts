import { PrinterState } from "../telemetry";

export const STATE_IDLE = 1;
const STATE_PRINTING = 6;
const SUB_STATE_PRINTING = 1;
const SUB_STATE_CANCELED = 20;
const SUB_STATE_FINISHED = 11;
const SUB_STATE_FEED_ME = 6;

export function isPrinting(printer_state: PrinterState): boolean {
  const { state, substate } = printer_state;
  if (substate) {
    return (
      state == STATE_PRINTING &&
      substate != SUB_STATE_CANCELED &&
      substate != SUB_STATE_FINISHED
    );
  } else {
    return false;
  }
}

export function isPrintingFeedMe(printer_state: PrinterState): boolean {
  const { state, substate } = printer_state;
  if (substate) {
    return state == STATE_PRINTING && substate == SUB_STATE_FEED_ME;
  } else {
    return false;
  }
}

export function canCancelPrinting(printer_state: PrinterState): boolean {
  const { state, substate } = printer_state;
  if (substate) {
    return state == STATE_PRINTING && substate == SUB_STATE_PRINTING;
  } else {
    return false;
  }
}
