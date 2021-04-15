// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { handleError } from "../components/errors";
import { translate } from "../../locale_provider";
import { setBusy, clearBusy } from "../components/busy";
import { states, to_page } from "../components/state";
import { navigateToProjects } from "../components/projects";

export const setUpRefill = () => {
  document.getElementById("refill").onclick = () => {
    navigateToProjects();
    setBusy();
    getJson("/api/system/commands/custom/resinrefill", {
      method: "POST",
    })
      .then((result) => {
        clearBusy();
      })
      .catch((result) => {
        clearBusy();
        handleError(result);
      });
  };
};

const load = () => {
  translate("refill.title", { query: "#title-status-label" });
  const yesButton = document.getElementById("yes");
  const noButton = document.getElementById("no");
  yesButton.onclick = () => {
    yesButton.disabled = true;
    noButton.disabled = true;
    getJson("/api/system/commands/custom/resinrefilled", {
      method: "POST",
    }).catch((result) => handleError(result));
  };
  noButton.onclick = () => {
    yesButton.disabled = true;
    noButton.disabled = true;
    getJson("/api/job", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command: "pause", action: "resume" }),
    }).catch((result) => handleError(result));
  };
};

export const update = (context) => {
  if (context.state == states.REFILL) {
    for (let buttonId of ["yes", "no"]) {
      document.getElementById(buttonId).disabled = false;
    }
  } else {
    to_page(context.state);
  }
};

export default { load, update };
