// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import direct from "./direct";
import TabsController from "./tabs";

const remote = process.env.WITH_REMOTE_UPLOAD ? require("./remote").default : null;
const tabs = new TabsController();

function init(origin="local", path="", projectExtensions) {
  direct.init(origin, path, projectExtensions);
  remote?.init(origin, path);

  tabs.init(document.getElementById("upld"));
  updateTabs();
}

function update() {
  remote?.update();
  updateTabs();
}

function updateTabs() {
  if (direct.isUploading) {
    tabs.openTab("direct");
    tabs.lock();
  } else if (remote?.isUploading) {
    tabs.openTab("remote");
    tabs.lock();
  } else {
    tabs.unlock();
    if (!tabs.selected)
      tabs.openTab("direct");
  }
}

export default { init, update };
