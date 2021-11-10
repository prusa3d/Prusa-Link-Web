// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import upload from "../components/upload";
import { translate } from "../../locale_provider";
import * as job from "../components/job";

const updateTitles = (context) => {
  const state = context.printer?.state;
  if (context && state) {
    console.log(state)
    if (state.flags.error || state.flags.closedOrError)
      translate("ntf.error", { query: "#title-status" });
    else if (!state.flags.operational)
      translate("prop.st-busy", { query: "#title-status" });
    else if (state.flags.paused) {
      if (state.text === "Pour in resin")
        translate("prop.st-pour-resin", { query: "#title-status" });
      else if (state.text === "Feed me")
        translate("prop.st-feedme", { query: "#title-status" });
      else
        translate("prop.st-paused", { query: "#title-status" });
    }
    else if (state.flags.printing)
      translate("prop.st-printing", { query: "#title-status" });
    else
      translate("prop.st-idle", { query: "#title-status" });
  }
};

const load = (context) => {
  upload.init();
  graph.render();
  update(context);
};

const update = (context) => {
  updateTitles(context);
  job.update(context);
  upload.update();
};

export default { load, update };
