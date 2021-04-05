// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { navigate } from "../../router.js";

export const states = {
  IDLE: "idle",
  PRINTING: "printing",
  OPENED: "opened",
  BUSY: "busy",
  REFILL: "refill",
};

export const get_state = (data) => {
  const flags = data.state.flags;

  if (flags.printing) {
    if (flags.ready) {
      return states.OPENED;
    } else {
      if (flags.paused) {
        return states.REFILL;
      } else if (flags.busy) {
        return states.BUSY;
      } else {
        return states.PRINTING;
      }
    }
  }

  return states.IDLE;
};

export const to_page = (state) => {
  switch (state) {
    case states.IDLE:
      navigate("#projects");
      break;
    case states.PRINTING:
      navigate("#job");
      break;
    case states.OPENED:
      navigate("#preview");
      break;
    case states.BUSY:
      navigate("#busy");
      break;
    case states.REFILL:
      navigate("#refill");
      break;
  }
};
