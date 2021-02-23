// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { navigate } from "../../router.js";
import { updateProperties } from "../components/updateProperties.js";
import { handleError } from "../components/errors";
import { cancelJob } from "../components/job";

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

      /**
       * set up cancel button
       */
      const cancelButton = document.getElementById("no");
      if (cancelButton && !cancelButton.onclick) {
        cancelButton.onclick = cancelJob;
      }
    })
    .catch((result) => handleError(result));
};

/**
 * update job
 * @param {object} context
 */
export const update = (context) => {
  if (context.printer.state.flags.printing) {
    if (context.printer.state.flags.ready) {
      navigate("#preview");
    } else {
      load();
    }
  } else {
    navigate("#projects");
  }
};

export default { load, update };
