// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import upload from "../components/upload";
import { load as job } from "./job.js";
import { navigateToProjects } from "../components/projects";
import { translate } from "../../locale_provider";
import { states } from "../components/state";

const idleTitle = () => {
  document.getElementById("title-status").innerText = translate("prop.st-idle");
};

const printingTitle = () => {
  document.getElementById("title-status").innerText = translate(
    "prop.st-printing"
  );
};

const load = () => {
  document.getElementById(
    "title-status-label"
  ).innerHTML = `<p class="txt-grey" >${translate(
    "home.title"
  )}:<span id="title-status" class="txt-orange">Idle</span></p>`;
  idleTitle();
  document.getElementById("temps-title").innerText = translate(
    "temps.title"
  ).toLowerCase();
  upload.init();
  graph.render();
};

const update = (context) => {
  const jobElm = document.querySelector(".job");

  switch (context.state) {
    case states.SELECTED:
      if (context.last_state == states.IDLE) {
        navigateToProjects();
      }
    case states.READY:
    case states.ERROR:
    case states.ATTENTION:
      idleTitle();
      break;
    case states.PRINTING:
      printingTitle();
      if (jobElm.hasAttribute("hidden")) {
        jobElm.removeAttribute("hidden");
      }
      job();
      break;
    case states.BUSY:
    case states.REFILL:
      printingTitle();
      if (!jobElm.hasAttribute("hidden")) {
        jobElm.setAttribute("hidden", true);
      }
      break;
  }
};

export default { load, update };
