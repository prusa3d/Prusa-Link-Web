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

const confirmJob = process.env.WITH_COMMAND_SELECT ? (fileUrl) =>
  getJson(fileUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command: "select" }),
  }).then(() => getJson("/api/job", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command: "start" }),
  })) : (fileUrl) => getJson(fileUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command: "start" }),
  });

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
      }).catch(
        (result) => handleError(result)
      );
      close();
    },
    next: page,
  });
};

/**
 * Confirm job modal.
 */
 const createConfirmJob = (close, fileUrl) => {
  const template = document.getElementById("modal-confirm");
  const node = document.importNode(template.content, true);
  const yesButton = node.getElementById("yes");
  yesButton.addEventListener("click", (event) => {
    event.preventDefault();
    confirmJob(fileUrl)
      .then(() => navigate("#dashboard"))
      .catch((result) => handleError(result))
      .finally(() => close());
  });
  const noButton = node.getElementById("no");
  noButton.addEventListener("click", close);
  return node;
};

/**
 * Conditionally shows modal, then starts printing the file that is currently previewed.
 */
 export const startJob = (showConfirmModal, fileUrl) => {
  if (showConfirmModal) {
    modal((close) => createConfirmJob(close, fileUrl), {
      timeout: 0,
      closeOutside: false,
    });
  } else {
    confirmJob(fileUrl)
      .then(() => navigate("#dashboard"))
      .catch((result) => handleError(result));
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
