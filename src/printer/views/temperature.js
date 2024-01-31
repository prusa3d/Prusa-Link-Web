// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import { translate } from "../../locale_provider";

const load = () => {
  translate("temps.title", { query: "#title-status-label" });
  graph.render();
};

export default { load };
