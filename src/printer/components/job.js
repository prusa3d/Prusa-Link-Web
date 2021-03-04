// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { navigate } from "../../router.js";
import { info } from "../components/toast";
import { handleError } from "../components/errors";
import { doQuestion } from "../components/question";
import { translate } from "../../locale_provider";

/**
 * start print
 */
export const confirmJob = () => {
  info(translate("btn.start-pt"), translate("ntf.start-print"));
  return getJson("/api/job", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command: "start" }),
  }).catch((result) => handleError(result));
};

/**
 * stop print
 */
export const cancelJob = () => {
  navigate("#projects");
  document.title = process.env.TITLE + " - " + translate("proj.link");
  history.pushState(null, document.title, "#projects");
  navigate("#loading");
  doQuestion({
    title: translate("btn.cancel"),
    questionChildren: translate("msg.cancel"),
    yes: (close) => {
      getJson("/api/job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command: "cancel" }),
      })
        .catch((result) => handleError(result))
        .finally((result) => close());
    },
    next: "#job",
  });
};
