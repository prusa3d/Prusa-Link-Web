// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";

const load = () => {
  const template = document.getElementById("graph-template");
  const node = document.importNode(template.content, true);
  document.getElementById("graph").appendChild(node);
  graph.render();
};

export default { load };
