// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import { load as job } from "./job.js";
import { translateTitles } from "../mini/translate";
import upload from "../components/upload";

const updateTitles = (context) => {
  if (
    context &&
    context.printer.state.flags.printing &&
    !context.printer.state.flags.ready
  ) {
    document.getElementById("title-status").innerText = translate(
      "prop.st-printing"
    );
    return true;
  } else {
    document.getElementById("title-status").innerText = translate(
      "prop.st-idle"
    );
    return false;
  }
};

const load = () => {
  console.log("Dashboard Logic - mk3");
  translateTitles();
  updateTitles();
  upload.init();
  graph.render();
};

const update = (context) => {
  const jobElm = document.querySelector(".job");
  if (updateTitles(context)) {
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
