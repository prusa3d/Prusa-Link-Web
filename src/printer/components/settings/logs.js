// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { translate } from "../../../locale_provider";
import { getJson, getPlainText } from "../../../auth";
import download from "../../../helpers/download";
import { Dropdown } from "../dropdown";
import { handleError } from "../errors";
import formatData from "../dataFormat";

let selectedFileName = null;
let selectedFileDate = null;
const sizeLimit = 1_000_000;

const load = () => {
  initLogs();
};

function initLogs() {
  getJson("api/logs").then(result => {
    const files = result.data.files;

    const dropdown = Dropdown.init("settings");
    const options = files.map(file => file.name);
    const placeholder = translate("logs.select-file-placeholder");

    dropdown.setOptions(options);
    dropdown.select(placeholder);
    dropdown.onselect = (filename) => {
      selectLogFile(filename);
    }
  }).catch((result) => handleError(result));
}

function selectLogFile(filename) {
  selectedFileName = filename;
  selectedFileDate = null;

  document.getElementById("download-log").onclick = () => {
    download(`api/logs/${filename}`, filename)
  }
  update();
};

function showLogContent(filename) {
  getPlainText(`api/logs/${filename}`).then(result => {
    const ul = document.querySelector("ul.logs");
    if (ul) {
      if (result.data) {
        ul.innerHTML = result.data.split("\n")
          .map(row => createLi(row))
          .join("");
      } else {
        ul.innerHTML = createLi(translate("logs.empty-file"));
      }
    }
  })
}

function showLogExceedSizeLimit() {
  const ul = document.querySelector("ul.logs");
  const message = translate("logs.file-too-large", { size: formatData("size", sizeLimit) });
  if (ul) {
    ul.innerHTML = createLi(message);
  }
}

function createLi(innerHTML) {
  `<li class="txt-size-2>${innerHTML}</li>`;
}

const update = () => {
  getJson("api/logs").then(result => {
    const files = result.data.files;
    if (selectedFileName) {
      const file = files.find((file) => file.name === selectedFileName)
      if (file) {
        if (!selectedFileDate || file.date > selectedFileDate) {
          selectedFileDate = file.date;
          if (file.size > sizeLimit) {
            showLogExceedSizeLimit();
          } else {
            showLogContent(selectedFileName);
          }
        }
      }
    }
  }).catch((result) => handleError(result));
};

export default { load, update };
