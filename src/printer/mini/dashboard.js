// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import Job from "./job.js";
import { translate } from "../../locale_provider";

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
  document.getElementById(
    "title-status-label"
  ).innerHTML = `<p class="txt-grey" >${translate(
    "home.title"
  )}:<span id="title-status" class="txt-orange">Idle</span></p>`;
  updateTitles();
  graph.render();
};

const update = (context) => {
  if (updateTitles(context)) {
    Job.load();
  } else {
    Job.update({});
  }
};

export default { load, update };
