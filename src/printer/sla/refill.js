// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { handleError } from "../components/errors";
import { navigate } from "../../router.js";
import { translate } from "../../locale_provider";

export const setUpRefill = () => {
  const page = window.location.hash;
  document.title = process.env.APP_TITLE + " - " + translate("proj.link");
  history.pushState(null, document.title, page);
  navigate("#loading");
  getJson("/api/system/commands/custom/resinrefill", {
    method: "POST",
  })
    .then((result) => navigate("#refill"))
    .catch((result) => {
      handleError(result);
      navigate(page);
    });
};

const load = () => {
  const page = window.location.hash;
  translate("refill.title", { query: "#title-status-label" });
  const yesButton = document.getElementById("yes");
  const noButton = document.getElementById("no");
  yesButton.onclick = () => {
    yesButton.disabled = true;
    noButton.disabled = true;
    getJson("/api/system/commands/custom/resinrefilled", {
      method: "POST",
    })
      .catch((result) => handleError(result))
      .finally((result) => navigate(page));
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
    })
      .catch((result) => handleError(result))
      .finally((result) => navigate(page));
  };
};

export const update = (context) => {
  const flags = context.printer.state.flags;
  if (flags.paused) {
    for (let buttonId of ["yes", "no"]) {
      document.getElementById(buttonId).disabled = false;
    }
  }
};

export default { load, update };
