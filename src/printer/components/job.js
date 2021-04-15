// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { translate } from "../../locale_provider";
import { info } from "./toast";
import { setBusy } from "./busy";
import { handleError } from "./errors";
import { doQuestion } from "./question";
import { navigateToProjects } from "./projects";

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
export const cancelJob = (e) => {
  navigateToProjects();
  setBusy();
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
    next: null,
  });
};
