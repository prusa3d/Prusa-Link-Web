// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { updateProperties } from "../components/updateProperties.js";
import { handleError } from "../components/errors.js";
import { translate } from "../../locale_provider";

const update = (data) => {
  updateProperties("job", data);
};

const translateTexts = () => {
  const jobMenu = document.querySelector(".job");
  if (!jobMenu.dataset.translated) {
    translate("proj.title", { query: "#title-status-label" });
    translate("prop.z-height", { query: "#pos_z_mm" });
    translate("prop.speed", { query: "#printing_speed" });
    translate("prop.flow", { query: "#flow_factor" });
    translate("prop.rem-time", { query: "#estimated-end" });
    translate("prop.pnt-time", { query: "#print_dur" });
    jobMenu.dataset.translated = true;
  }
};

export const load = () => {
  translateTexts();
  getJson("/api/job")
    .then((result) => {
      const data = result.data;
      const completion = data.progress.completion;
      if (completion) {
        document.querySelector("progress").value = completion;
      }
      update(data);
    })
    .catch((result) => handleError(result));
};

export default { load, update };
