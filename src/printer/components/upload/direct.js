// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { error, success } from "../toast";
import { handleError } from "../errors";
import { translate } from "../../../locale_provider";
import uploadRequest from "../../../helpers/upload_request";

const fileType = process.env.PRINTER_TYPE === "fdm" ? "gcode" : "sl1";
let isUploading = false;
let progress = 0;

function init(origin, path) {
  translate("upld.direct.choose", { query: "#upld-direct p", file: `*.${fileType}` });
  initInput(origin || "local", "/" + path);
  if (isUploading) {
    setState("uploading");
    setProgress(progress);
  }
}

function initInput(origin, path) {
  var input = document.querySelector('#upld-direct input[type="file"]');
  if (input) {
    input.setAttribute("accept", `.${fileType}`);
    input.onchange = () => {
      if (input.files.length > 0 && !isUploading) {
        let file = input.files[0];
        let print = document.getElementById("upld-direct-start-pt")?.checked || false;
        uploadFile(file, origin, path, print);
      }
    }
  }
}

function reset() {
  const input = document.querySelector('#upld-direct input[type="file"]');
  if (input)
    input.value = "";
  setProgress(0);
  setState("choose");
}

function setState(state) {
  isUploading = state === "uploading";
  const el = document.getElementById("upld-direct");
  if (el)
    el.setAttribute("data-state", state);
}

function setProgress(pct) {
  progress = pct;
  const el = document.getElementById("upld-progress");
  if (el)
    el.innerHTML = `${pct} %`;
}

const uploadFile = (file, origin, path, print) => {
  let url = `/api/files/${origin || "local"}`;
  var data = new FormData()
  data.append('path', path || "/");
  data.append('file', file);
  data.append('print', print);

  setState("uploading");
  uploadRequest(url, data, {
    onProgress: (progress) => onProgressChanged(progress.percentage)
  }).then(result => onUploadSuccess(file.name))
    .catch(result => onUploadError(result))
    .finally(() => reset());
}

function onProgressChanged(pct) {
  setState("uploading");
  setProgress(pct);
}

function onUploadSuccess(fileName) {
  const title = translate("ntf.success");
  const message = translate("ntf.upld-suc", { file_name: fileName });
  success(title, message);
}

function onUploadError(result) {
  if (result) {
    handleError(result);
  } else {
    const title = translate("ntf.error");
    const message = translate("ntf.upld-unsuc", { file_name: file.name });
    error(title, message);
  }
}

export default {
  init,
  get isUploading () {
    return isUploading;
  },
};
