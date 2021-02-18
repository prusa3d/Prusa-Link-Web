// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import { updateTitles } from "./index";
import { load as job } from "./job.js";

const load = () => {
  console.log("Dashboard Logic - mk3");
  updateTitles();
  graph.render();
};

const update = (context) => {
  const jobElm = document.querySelector(".job");
  if (updateTitles()) {
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
