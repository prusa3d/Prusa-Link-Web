// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import direct from "./direct";
import remote from "./remote";
import slicer from "./slicer";
import TabsController from "./tabs";

const tabs = new TabsController();

function init(origin="local", path="") {
  direct.init(origin, path);
  remote.init(origin, path);
  slicer.init();

  tabs.init(document.getElementById("upld"));
  updateTabs();
}

function update() {
  remote.update();
  updateTabs();
}

function updateTabs() {
  if (direct.isUploading) {
    tabs.openTab("direct");
    tabs.lock();
  } else if (remote.isUploading) {
    tabs.openTab("remote");
    tabs.lock();
  } else {
    tabs.unlock();
  }
}

export default { init, update };
