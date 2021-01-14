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
import { translate } from "../../locale_provider";

const translateTexts = () => {
  const jobMenu = document.querySelector(".job");
  if (!jobMenu.dataset.translated) {
    translate("proj.title", { query: "#title-status-label" });
    translate("prop.rem-time", { query: "#remaining-time" });
    translate("prop.est-end", { query: "#estimated-end" });
    translate("prop.pnt-time", { query: "#printing-time" });
    translate("prop.layers", { query: "#layers" });
    translate("prop.sla-rmn-mt", { query: "#remaining-resin" });
    translate("prop.sla-csm-mt", { query: "#consumed-resin" });
    translate("btn.chg-exp", { query: "#exposure > p" });
    translate("btn.sla-refill", { query: "#refill > p" });
    translate("btn.cancel-pt", { query: "#no > p" });
    jobMenu.dataset.translated = true;
  }
};

/**
 * load job
 */
export const load = () => {
  translateTexts();
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
