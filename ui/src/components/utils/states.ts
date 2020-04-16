// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { PrinterState } from "../telemetry";

export const STATE_IDLE = 1;
const STATE_PRINTING = 6;
const SUB_STATE_PRINTING = 1;
const SUB_STATE_GOING_UP = 2;
const SUB_STATE_FEED_ME = 6;
const SUB_STATE_PENDING_ACTION = 10;
const SUB_STATE_FINISHED = 11;
const SUB_STATE_CONFIRM = 15;
const SUB_STATE_CANCELED = 20;

export function isPrinting(printer_state: PrinterState): boolean {
  const { state, substate } = printer_state;
  if (substate) {
    return (
      state == STATE_PRINTING &&
      substate != SUB_STATE_CANCELED &&
      substate != SUB_STATE_FINISHED &&
      substate != SUB_STATE_CONFIRM
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

export function isPrintingConfirm(printer_state: PrinterState): boolean {
  const { state, substate } = printer_state;
  if (substate) {
    return state == STATE_PRINTING && substate == SUB_STATE_CONFIRM;
  } else {
    return false;
  }
}

export function isPrintingPending(printer_state: PrinterState): boolean {
  const { state, substate } = printer_state;
  if (substate) {
    return (
      state == STATE_PRINTING &&
      (substate == SUB_STATE_PENDING_ACTION || substate == SUB_STATE_GOING_UP)
    );
  } else {
    return false;
  }
}
