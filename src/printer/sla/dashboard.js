// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import upload from "../components/upload";
import { translate } from "../../locale_provider";
import * as job from "../components/job";

const load = (context) => {
  translate("home.link", { query: "#title-status-label" });
  upload.init("local", "", context.fileExtensions);
  graph.render();
  update(context);
};

const update = (context) => {
  const flags = context.printer.state.flags;
  job.update(context);
  upload.update(flags.ready && flags.operational);
};

export default { load, update };
