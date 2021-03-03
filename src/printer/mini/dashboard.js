// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import Job from "./job.js";
import upload from "../components/upload";
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
  console.log("Dashboard Logic - mini");
  upload.init();
  updateTitles();
  graph.render();
};

const update = (context) => {
  if (updateTitles(context)) {
    Job.load();
  } else {
    Job.update(null);
  }
};

export default { load, update };
