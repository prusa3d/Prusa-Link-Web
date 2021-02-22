// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { updateProperties } from "./updateProperties.js";
import { errorFormat, handleError } from "./errors";
import { navigate } from "../../router.js";
import { info } from "./toast";

/**
 * start print
 */
export const confirmJob = () => {
  info("Start print", "The printer is getting ready.");
  return getJson("/api/job", handleError, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command: "start" }),
  });
};

/**
 * load job
 */
export const load = () => {
  getJson("/api/job", (status, data) => {
    if (status.ok) {
      const completion = data.progress.completion;
      if (completion != undefined) {
        document.querySelector("progress").value = completion;
        updateProperties("job", data);
      }
    } else {
      errorFormat(data.title, data.message);
    }
  });
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
