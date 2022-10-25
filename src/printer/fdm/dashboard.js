// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import upload from "../components/upload";
import camera from "../components/camera";
import { translate } from "../../locale_provider";
import * as job from "../components/job";
import { LinkState, OperationalStates } from "../../state";

const load = (context) => {
  translate("home.link", { query: "#title-status-label" });
  upload.init("local", "", context.fileExtensions);
  graph.render();
  update(context);
  if (process.env['WITH_CAMERA']) {
    camera.init();
  }
};

const update = (context) => {
  const linkState = LinkState.fromApi(context.printer.state);
  job.update(context);
  upload.update(linkState);
  if (process.env['WITH_CAMERA']) {
    camera.update();
  }
};

export default { load, update };
