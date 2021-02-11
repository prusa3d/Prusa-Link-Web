// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as projectsTree from "../components/projects";

const load = () => {
  console.log("Preview Logic - sl1");
  document.getElementById("cancel").addEventListener("click", (e) => {
    projectsTree.back();
    e.preventDefault();
  });
};

export default { load };
