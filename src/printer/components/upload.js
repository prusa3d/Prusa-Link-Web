// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { handleError } from "./errors";
import { error, success } from "./toast";
import { translate } from "../../locale_provider";
import uploadRequest from "../../helpers/upload_request";

const fileType = process.env.PRINTER_FAMILY === "fdm" ? "gcode" : "sl1";

const upload = {
  init: (origin, path) => {
    translate("upld.open", { query: "#upload p", file: `*.${fileType}` });
    initInput(origin || "local", path);
  },
};

function initInput(origin, path) {
  reset();
  var input = document.querySelector('#upload input[type="file"]');
  input.setAttribute("accept", `.${fileType}`);
  input.onchange = () => {
    if (input.files.length > 0)
      // TODO: upload multiple files?
      uploadFile(input.files[0], origin, path);
  };
}

function reset() {
  document.querySelector('#upload input[type="file"]').value = "";
  setState("choose");
}

function setState(state) {
  document.getElementById("upload").setAttribute("data-state", state);
}

function setProgress(pct) {
  document.getElementById("upload-progress").innerHTML = `${pct} %`;
}

const uploadFile = (file, origin, path) => {
  let url = `/api/files/${origin || "local"}`;
  var data = new FormData();
  if (path) data.append("path", path);
  data.append("file", file);

  setState("uploading");
  uploadRequest(url, data, {
    onProgress: (progress) => setProgress(progress.percentage),
  })
    .then((result) => {
      const title = translate("ntf.success");
      const message = translate("ntf.upld-suc", { file_name: file.name });
      success(title, message);
    })
    .catch((result) => handleError(result))
    .finally(() => {
      reset();
    });
};

export default upload;
