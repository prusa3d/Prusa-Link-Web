// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import { updateTitles } from "./index";
import Job from "./job.js";

const load = () => {
  console.log("Dashboard Logic - mini");
  graph.render();
};

const update = (context) => {
  if (updateTitles()) {
    Job.load();
  } else {
    Job.update(null);
  }
};

export default { load, update };
