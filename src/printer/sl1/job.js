// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { updateProperties } from "../components/updateProperties.js";
import { handleError } from "../components/errors";
import changeExposureTimesQuestion from "./exposure";
import { cancelJob } from "../components/job";
import { setUpRefill } from "./refill";
import { translate } from "../../locale_provider";
import { states, to_page } from "../components/state";

/**
 * load job
 */
export const load = () => {
  if (window.location.hash == "#projects") {
    translate("proj.title", { query: "#title-status-label" });
  }
  getJson("/api/job")
    .then((result) => {
      const data = result.data;
      const completion = data.progress.completion;
      const progress = document.querySelector("progress");
      if (completion != undefined && progress) {
        document.querySelector("progress").value = completion;
        updateProperties("job", data);
      }

      const cancelButton = document.getElementById("no");
      if (cancelButton && !cancelButton.onclick) {
        /**
         * set up cancel button
         */
        cancelButton.onclick = cancelJob;
        /**
         * set up change exposure times button (sla)
         */
        changeExposureTimesQuestion("#job");

        /**
         * set up refill (sla)
         */
        setUpRefill();
      }
    })
    .catch((result) => handleError(result));
};

/**
 * update job
 * @param {object} context
 */
export const update = (context) => {
  if (context.state != states.PRINTING) {
    to_page(context.state);
  } else {
    load();
  }
};

export default { load, update };
