// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import { translate } from "../../locale_provider";
import { states } from "../components/state";
import { navigateToProjects } from "../components/projects";

const load = () => {
  translate("temps.title", { query: "#title-status-label" });
  graph.render();
};

const update = (context) => {
  if (context.last_state == states.IDLE && context.state == states.OPENED) {
    navigateToProjects();
  }
};

export default { load, update };
