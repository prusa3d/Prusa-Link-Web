// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { error, warning } from "./toast";

let last_error = [null, null];

/**
 * common interface for handling errors from requests
 * @param {object} data
 * @param {{fallbackMessage: {title: String, message: String}?}?} options
 */
export function handleError(result, options) {
  if (process.env.MODE == "development") {
    console.error("Handle error", result);
  }

  let title = result?.data?.title
    || options?.fallbackMessage?.title
    || "Error";
  let message = result?.data?.message
    || options?.fallbackMessage?.message
    || "Action can not be performed";
  let isWarning = false;

  if (result?.data) {
    const data = result.data;
    last_error[0] = data.code || 0;
    if (data.code) {
      title += `- ${data.code}`;
      if (`${data.code}`[3] == "7")
        isWarning = true;
    }
    if (data.url)
      message += `<br/><a href="${data.url}" target="_blank">more info</a>`;
  }

  if (isWarning) {
    warning(title, message);
  } else {
    error(title, message);
  }
}

export function checkErrors() {
  return getJson("/api/printer/error").then(({ data, ...others }) => {
    const code = data.code;
    if (
      code &&
      last_error.indexOf(code) < 0 &&
      sessionStorage.getItem("error_seen") != code
    ) {
      last_error[1] = code;
      sessionStorage.setItem("error_seen", code);
      handleError({ data });
    }

    if (!code) {
      sessionStorage.removeItem("error_seen");
    }
  });
}