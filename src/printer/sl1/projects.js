// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as projectsTree from "../components/projects";

const load = () => {
  console.log("Project Logic - sl1");
  projectsTree.update();
};

export default { load };