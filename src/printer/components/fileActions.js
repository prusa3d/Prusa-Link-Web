// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getFile, getJson } from "../../auth";
import { handleError } from "./errors";
import { doQuestion } from "./question";
import { translate } from "../../locale_provider";
import download from "../../helpers/download";

/**
 * download file
 */
export const downloadFile = (file) => {
  if (!file?.refs?.download)
    return; // TODO: Consider showing error

  getFile(file.refs.download).then((url) => {
    download(url, file.display || jobFile.display || file.name || jobFile.name);
  }).catch((result) => handleError(result))
};

/**
 * delete file
 */
 export const deleteFile = (file) => {
  if (!file?.refs?.resource)
    return; // TODO: Consider showing error

  const page = window.location.hash;
  doQuestion({
    title: translate("proj.del"),
    // TODO: add strong - Do you really want to delete <strong>${file.name}</strong>?
    questionChildren: translate("msg.del-proj", { file_name: file.display || file.name }),
    yes: (close) => {
      getJson(file.refs.resource, { method: "DELETE" })
        .catch((result) => handleError(result))
        .finally((result) => close());
    },
    next: page,
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
