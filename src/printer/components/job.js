// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { navigate } from "../../router.js";
import { info } from "../components/toast";
import { handleError } from "../components/errors";
import { doQuestion } from "../components/question";

/**
 * start print
 */
export const confirmJob = () => {
  info("Start print", "The printer is getting ready.");
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
  navigate("#loading");
  doQuestion({
    title: "Cancel",
    questionChildren: "Do you really want to cancel print?",
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
