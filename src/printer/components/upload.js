// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { handleError } from "./errors";
import { success } from "./toast";
import { translate } from "../../locale_provider";

const fileType = process.env.PRINTER_FAMILY === "fdm" ? "gcode" : "sl1";

let upload = {
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
    if (input.files.length > 0) // TODO: upload multiple files?
      uploadFile(input.files[0], origin, path);
  }
}

function reset() {
  document.querySelector('#upload input[type="file"]').value = "";
  setState("choose");
}

function setState(state) {
  document.getElementById("upload").setAttribute("data-state", state);
}

const uploadFile = (file, origin, path) => {
  let url = `/api/files/${origin || "local"}`;
  var data = new FormData()
  if (path)
    data.append('path', path);
  data.append('file', file);

  setState("uploading");
  getJson(url, {
    method: "POST",
    body: data
  })
    .then(result => {
      const title = translate("ntf.success");
      const message = translate("ntf.upld-suc", { file_name: file.name });
      success(title, message);
      reset();
    })
    .catch(result => {
      handleError(result);
      reset();
    });
}

export default upload;
