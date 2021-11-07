// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { doQuestion } from "./question";
import { getJson } from "../../auth";
import { handleError } from "./errors";
import { modal } from "./modal";
import { navigate } from "../../router.js";
import { translate } from "../../locale_provider";


/**
 * Start printing.
 */
const confirmJob = () => {
  return getJson("/api/job", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command: "start" }),
  }).catch((result) => handleError(result));
};

/**
 * Pause printing.
 */
export const pauseJob = () => {
  return getJson("/api/job", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command: "pause", action: "pause" }),
  }).catch((result) => handleError(result));
}

/**
 * Resume printing.
 */
 export const resumeJob = () => {
  return getJson("/api/job", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command: "pause", action: "resume" }),
  }).catch((result) => handleError(result));
}

/**
 * Shows modal, then stops printing.
 */
 export const cancelJob = () => {
  const page = window.location.hash;
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
    next: page,
  });
};

/**
 * Confirm job modal.
 */
 const createConfirmJob = (close) => {
  const template = document.getElementById("modal-confirm");
  const node = document.importNode(template.content, true);
  const yesButton = node.getElementById("yes");
  yesButton.addEventListener("click", (event) => {
    event.preventDefault();
    confirmJob().then(() => {
      close();
      if (process.env.PRINTER_TYPE === "fdm") {
        if (navigate("#dashboard"))
          history.pushState(null, document.title, "#dashboard");
      }
    });
  });
  const noButton = node.getElementById("no");
  noButton.addEventListener("click", close);
  return node;
};

/**
 * Conditionally shows modal, then starts printing the file that is currently previewed.
 */
 export const startJob = (showConfirmModal) => {
  if (showConfirmModal) {
    modal(createConfirmJob, {
      timeout: 0,
      closeOutside: false,
    });
  } else {
    confirmJob();
  }
};

/**
 * Cancel preview (stop printing without showing a modal).
 */
export const cancelPreview = () => {
  return getJson("/api/job", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command: "cancel" }),
  })
    .catch((result) => handleError(result))
}
