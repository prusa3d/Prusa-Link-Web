// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { updateProperties } from "../components/updateProperties.js";
import { handleError } from "../components/errors";
import { navigate } from "../../router.js";
import changeExposureTimesQuestion from "./exposure";
import { cancelJob } from "../components/job";
import { setUpRefill } from "./refill";

/**
 * load job
 */
export const load = () => {
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
        changeExposureTimesQuestion(data.job.file, "#job");

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
  const flags = context.printer.state.flags;
  if (flags.printing) {
    if (flags.ready) {
      navigate("#preview");
    } else {
      if (flags.pausing || flags.paused) {
        navigate("#refill");
      } else {
        load();
      }
    }
  } else {
    navigate("#projects");
  }
};

export default { load, update };
