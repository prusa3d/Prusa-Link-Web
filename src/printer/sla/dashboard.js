// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import upload from "../components/upload";
import { translate } from "../../locale_provider";
import * as job from "../components/job";

const updateTitles = (context) => {
  const flags = context.printer?.state?.flags;
  if (context && flags) {
    if (flags.printing && !flags.ready) {
      if (flags.paused) {
        translate("prop.st-paused", { query: "#title-status" });
      } else {
        translate("prop.st-printing", { query: "#title-status" });
      }
      return true;
    }
  }
  translate("prop.st-idle", { query: "#title-status" });
  return false;
};

const load = (context) => {
  upload.init();
  graph.render();
  update(context);
};

const update = (context) => {
  updateTitles(context);
  job.update(context);
  upload.update();
};

export default { load, update };
