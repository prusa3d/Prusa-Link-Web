// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getFile, getJson } from "../../auth";
import { handleError } from "./errors";
import { translate } from "../../locale_provider";
import download from "../../helpers/download";
import { modal } from "./modal";
import { setDisabled } from "../../helpers/element";

/**
 * download file
 */
export const downloadFile = (file, onComplete) => {
  if (!file?.refs?.download)
    return; // TODO: Consider showing error

  const displayFileName = file.display || jobFile.display || file.name || jobFile.name;

  if (process.env["WITH_API_KEY_AUTH"]) {
    getFile(file.refs.download).then((url) => {
      download(url, displayFileName);
    }).catch(
      (result) => handleError(result)
    ).finally(onComplete);
    return;
  }

  download(file.refs.download, displayFileName);
  onComplete();
};


const createDeleteFileModal = (close, file) => {
  const template = document.getElementById("modal-question");
  const node = document.importNode(template.content, true);
  const label = node.getElementById("modal-question-label");
  label.innerText = translate("msg.del-proj", { file_name: file.display || file.name });
  const yesButton = node.getElementById("yes");
  const noButton = node.getElementById("no");
  noButton.addEventListener("click", close);
  yesButton.addEventListener("click", (event) => {
    event.preventDefault();
    setDisabled(yesButton, true);
    setDisabled(noButton, true);
    getJson(file.refs.resource, { method: "DELETE" })
        .catch((result) => handleError(result))
        .finally((result) => close());
  });

  return node;
};

/**
 * delete file
 */
 export const deleteFile = (file) => {
  if (!file?.refs?.resource)
    return; // TODO: Consider showing error

  modal((close) => createDeleteFileModal(close, file), {
    timeout: 0,
    closeOutside: false,
  });
};

export const startPrint = () => {
  console.log("startPrint");
}
export const renameFile = () => {
  console.log("renameFile");
}
export const copyFile = () => {
  console.log("copyFile");
}

export const createFolder = () => {
  console.log("createFolder");
}
export const deleteFolder = () => {
  console.log("deleteFolder");
}
export const renameFolder = () => {
  console.log("renameFolder");
}
