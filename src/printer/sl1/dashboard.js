// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import { updateTitles } from "./index";
import { load as job } from "./job.js";
import { translateTitles } from "./translate";
import upload from "../components/upload";

const load = () => {
  console.log("Dashboard Logic - sl1");
  translateTitles();
  updateTitles();
  upload.init();
  graph.render();
};

const update = (context) => {
  const jobElm = document.querySelector(".job");
  const flags = context.printer.state.flags;
  if (updateTitles() && !(flags.pausing || flags.paused)) {
    if (jobElm.hasAttribute("hidden")) {
      jobElm.removeAttribute("hidden");
    }
    job();
  } else {
    if (!jobElm.hasAttribute("hidden")) {
      jobElm.setAttribute("hidden", true);
    }
  }
};

export default { load, update };
