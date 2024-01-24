// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { error, warning } from "./toast";

let reports = {};

/**
 * common interface for handling errors from requests
 * @param {object} data
 * @param {{fallbackMessage: {title: String, message: String}?}?} options
 */
export function handleError(result, options) {
  if (process.env.MODE == "development") {
    console.warn("Handle error", result);
  }

  let title = result?.data?.title
    || options?.fallbackMessage?.title
    || "Error";
  let message = result?.data?.message
    || options?.fallbackMessage?.message
    || "Action can not be performed";
  let isWarning = options?.isWarning ?? false;

  if (result?.data) {
    const data = result.data;
    if (data.code) {
      title += ` - ${data.code}`;
      if (`${data.code}`[3] == "7")
        isWarning = true;
    }
    if (data.url)
      message += `<br/><a href="${data.url}" target="_blank">more info</a>`;
  }

  const id = result?.data?.code || `${title}\n${message}`;
  if (reports[id])
    return;

  reports[id] = true;
  const onClose = () => reports[id] = false;

  if (isWarning) {
    warning(title, message, onClose);
  } else {
    error(title, message, onClose);
  }
}
