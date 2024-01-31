// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import upload from "../components/upload";
import cameras from "../components/cameras";
import { translate } from "../../locale_provider";
import * as job from "../components/job";
import { getJson } from "../../auth";

const load = (context) => {
  translate("home.link", { query: "#title-status-label" });
  graph.render();
  update(context);
  if (process.env['WITH_CAMERAS']) {
    cameras.update(context, null);
    cameras.updateCurrentCamera();
  }
  getJson("/api/v1/storage")
    .then(result => {
      const storage = result.data.storage_list.find(
        storage => storage.available && !storage.read_only
      );
      if (storage) {
        const origin = storage.path.replace("/", "");
        upload.init(origin, "", context.fileExtensions);
      }
    });
};

const update = (context) => {
  
  if (!context.printer) {
    return;
  }
  const linkState = context.state;

  job.update(context);
  upload.update(linkState);
  if (process.env['WITH_CAMERAS']) {
    cameras.update(context, null);
  }
};

export default { load, update };
