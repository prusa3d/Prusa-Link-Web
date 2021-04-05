// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { states, to_page } from "./state";
import { translate } from "../../locale_provider";
let context_busy = false;

export const setBusy = () => {
  context_busy = true;
  to_page(states.BUSY);
};

export const clearBusy = () => {
  context_busy = false;
};

const load = () => {
  translate("proj.title", { query: "#title-status-label" });
};

const update = (context) => {
  if (!(context_busy || context.state == states.BUSY)) {
    to_page(context.state);
  }
};

export default { load, update };
