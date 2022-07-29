// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../../auth";
import { handleError } from "../errors";
import { setDisabled } from "../../../helpers/element";
import { error, success } from "../toast";
import { translate } from "../../../locale_provider";
import { updateProgressBar } from "../progressBar";
import { attachConfirmModalToCheckbox } from "./confirm";
import updateProperties from "../updateProperties";

let isUploading = false;
let lastResult = null;

function init(origin, path) {
  const elm = document.getElementById("upld-remote");
  if (elm) {
    const urlInput = elm.querySelector("#remote-url");
    const nameInput = elm.querySelector("#remote-file-name");
    const uploadBtn = elm.querySelector("#upld-file");
    const startPtCheckbox = elm.querySelector("#upld-remote-start-pt");

    startPtCheckbox && attachConfirmModalToCheckbox(startPtCheckbox);

    uploadBtn.onclick = () => startUpload(
      urlInput.value,
      origin,
      path,
      { 
        to_print: startPtCheckbox.checked,
        rename: nameInput.value
      },
    );

    const updateUploadBtn = () => {
      setDisabled(uploadBtn, urlInput.value === "");
    }
    updateUploadBtn();
    urlInput.oninput = updateUploadBtn;
  }

  if (isUploading) {
    setState("uploading");
    if (lastResult)
      handleResult(lastResult);
  }

  update();
}

function update(canStartPrinting) {
  const startPrintCheckbox = document.querySelector("#upld-remote-start-pt");
  if (startPrintCheckbox) {
    if (!canStartPrinting) {
      startPrintCheckbox.checked = false;
    }
    setDisabled(startPrintCheckbox, !canStartPrinting)
  }
  getJson("api/download").then(result => {
    lastResult = result;
    handleResult(result);
  }).catch(result => {
    if (result.code) {
      handleError(result);
    }
    reset();
  });
}

function handleAccept(result) {
  setState("uploading");
  // updateProperties("download", data);
  const progressBar = document.querySelector("#upld-remote .progress-bar");
  updateProgressBar(progressBar, 0);
  const title = translate("ntf.success");
  const message = translate("ntf.upld-start");
  success(title, message);
}

function handleResult(result) {
  const data = result.data;

  if (!data && isUploading) {
    displaySuccess();
    reset();
    return;
  }

  setState(data ? "uploading" : "choose");
  if (data) {
    updateProperties("download", data);
    const progressBar = document.querySelector("#upld-remote .progress-bar");
    updateProgressBar(progressBar, data.progress || 0);
  }
}

/** Upload file from remote URL.
 * @param {String} url
 * @param {String} target
 * @param {String} destination
 * @param {{
 *  to_select: boolean | undefined,
 *  to_print: boolean | undefined,
 * }} options
 */
const startUpload = (url, target, destination, options) => {
  if (process.env.PRINTER_TYPE === "fdm") {
    if (target !== "local") {
      // TODO: Implement remote upload for SD Card when firmware will be ready
      error("Can't upload to " + target, "You can upload only to local storage via remote upload!");
      return;
    }
  }
  url = url.split('?')[0].split('&')[0].split('#')[0] // strip URL from parameters
  return getJson(`/api/download/${target}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      destination,
      ...options,
    }),
  }).then(
    result => handleAccept(result)
  ).catch((result) => handleResult(result));
}

function displaySuccess() {
  const title = translate("ntf.success");
  const message = translate("ntf.upld-suc", {
    file_name: "",
  });
  success(title, message);
}

function updateProgress(value) {
  const progressBar = document.querySelector("#upld-remote .progress-bar");
  if (progressBar)
    updateProgressBar(progressBar, value || 0);
}

function reset() {
  setState("choose");
  updateProgress(0);
  updateProperties("download", {});
  lastResult = null;
}

function setState(state) {
  isUploading = state == "uploading";
  const el = document.getElementById("upld-remote");
  if (el)
    el.setAttribute("data-state", state);
}

export default {
  init,
  update,
  get isUploading() {
    return isUploading;
  },
};

