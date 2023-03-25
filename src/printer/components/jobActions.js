// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { handleError } from "./errors";
import { modal } from "./modal";
import { navigate } from "../../router.js";
import { translate } from "../../locale_provider";
import { setDisabled } from "../../helpers/element";

/**
 * Start printing.
 */

const confirmJob = (fileUrl) => {
  return getJson(fileUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
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
 * Cancel job modal.
 */
 const createCancelJobModal = (close, onConfirm) => {
  const template = document.getElementById("modal-question");
  const node = document.importNode(template.content, true);
  const label = node.getElementById("modal-question-label");
  label.innerText = translate("msg.cancel");
  const yesButton = node.getElementById("yes");
  const noButton = node.getElementById("no");

  yesButton.addEventListener("click", (event) => {
    event.preventDefault();
    onConfirm && onConfirm();
    setDisabled(yesButton, true);
    setDisabled(noButton, true);
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
  });
  
  noButton.addEventListener("click", close);
  return node;
};

/**
 * Shows modal, then stops printing.
 */
 export const cancelJob = (onConfirm) => {
  modal((close) => createCancelJobModal(close, onConfirm), {
    timeout: 0,
    closeOutside: false,
  });
};

/**
 * Confirm job modal.
 */
 const createConfirmJob = (close, fileUrl) => {
  const template = document.getElementById("modal-confirm");
  const node = document.importNode(template.content, true);
  const yesButton = node.getElementById("yes");
  const noButton = node.getElementById("no");
  yesButton.addEventListener("click", (event) => {
    event.preventDefault();
    setDisabled(yesButton, true);
    setDisabled(noButton, true);
    confirmJob(fileUrl)
      .then(() => navigate("#dashboard"))
      .catch((result) => handleError(result))
      .finally(() => close());
  });
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
