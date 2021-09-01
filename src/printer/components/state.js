// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { navigate } from "../../router.js";

export const states = {
  READY: "ready",
  PRINTING: "printing",
  SELECTED: "selected",
  BUSY: "busy",
  REFILL: "refill",
  ATTENTION: "pour_resin",
  ERROR: "error",
};

export const get_state = (data) => {
  const flags = data.state.flags;

  if (flags.closedOrError) return states.ERROR;
  if (flags.busy) return states.BUSY;
  if (flags.printing) {
    if (flags.ready) {
      return states.SELECTED;
    } else {
      if (flags.paused) {
        return states.REFILL;
      } else if (flags.error) {
        return states.ATTENTION;
      } else {
        return states.PRINTING;
      }
    }
  }

  return states.READY;
};

export const to_page = (state) => {
  switch (state) {
    case states.READY:
    case states.ERROR:
      navigate("#projects");
      break;
    case states.PRINTING:
      navigate("#job");
      break;
    case states.SELECTED:
      navigate("#preview");
      break;
    case states.BUSY:
      navigate("#busy");
      break;
    case states.ATTENTION:
      navigate("#pour_resin");
      break;
    case states.REFILL:
      navigate("#refill");
      break;
  }
};
