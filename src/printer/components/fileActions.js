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
export const downloadFile = (fileUrl, fileDisplayName, onComplete) => {
  if (process.env["WITH_API_KEY_AUTH"]) {
    getFile(fileUrl).then((result) => {
      
      download(result.url, fileDisplayName);
    }).catch(
      (result) => handleError(result)
    ).finally(onComplete);
    return;
  }


  download(fileUrl, fileDisplayName);
  onComplete();
};


const createDeleteFileModal = (close, url, fileDisplayName, onComplete, isFolder = false) => {
  const template = document.getElementById("modal-question");
  const node = document.importNode(template.content, true);
  const label = node.getElementById("modal-question-label");
  label.innerText = isFolder
    ? translate("msg.del-folder", { folder_name: fileDisplayName })
    : translate("msg.del-proj", { file_name: fileDisplayName });
  const yesButton = node.getElementById("yes");
  const noButton = node.getElementById("no");
  noButton.addEventListener("click", close);
  yesButton.addEventListener("click", (event) => {
    event.preventDefault();
    setDisabled(yesButton, true);
    setDisabled(noButton, true);
    getJson(url, {
      method: "DELETE",
      headers: {
        "force": "?1"
      }
    })
      .then(() => onComplete && onComplete())
      .catch((result) => handleError(result))
      .finally((result) => close());
  });

  return node;
};

const createNewFolderModal = (close, getCurrentApiPath, onComplete) => {
  const template = document.getElementById("modal-file-name");
  const node = document.importNode(template.content, true);
  const input = node.getElementById("modal-file-name__input");

  const yesButton = node.getElementById("yes");
  const noButton = node.getElementById("no");
  noButton.addEventListener("click", close);
  yesButton.addEventListener("click", (event) => {
    event.preventDefault();
    const fileName = input.value;
      if (!!fileName) {
      const url = getCurrentApiPath(fileName);
      setDisabled(yesButton, true);
      setDisabled(noButton, true);
      getJson(url, {
        method: "PUT",
        headers: {
          "create-folder": "?1"
        }
      })
        .then(() => onComplete && onComplete())
        .catch((result) => handleError(result))
        .finally((result) => close());
  }
  });

  return node;
};

/**
 * delete file
 */
 export const deleteFile = (url, fileDisplayName, onComplete) => {
  modal((close) => createDeleteFileModal(close, url, fileDisplayName, onComplete), {
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

export const createFolder = (getCurrentApiPath, onComplete) => {
  modal((close) => createNewFolderModal(close, getCurrentApiPath, onComplete), {
    timeout: 0,
    closeOutside: false,
  })
}
export const deleteFolder = (url, folderDisplayName, onComplete) => {
  modal((close) => createDeleteFileModal(close, url, folderDisplayName, onComplete, true), {
    timeout: 0,
    closeOutside: false,
  });
}
export const renameFolder = () => {
  console.log("renameFolder");
}
