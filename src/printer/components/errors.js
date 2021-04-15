// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { error, warning } from "./toast";

let last_error = [null, null];

/**
 * common interface for handling errors from requests
 * @param {object} data
 */
export function handleError(result) {
  if (result && result.data) {
    const data = result.data;
    last_error[0] = data.code;
    const title = `${data.title} - ${data.code}`;
    const message =
      data.message + `<br/><a href="${data.url}" target="_blank">more info</a>`;

    if (data.code[3] == "7") {
      warning(title, message);
    } else {
      error(title, message);
    }
  }
}

export function checkErrors() {
  return fetch("/api/printer/error", {
    headers: { Accept: "application/json" },
  }).then((response) => {
    if (response.ok) {
      return response.json().then((data) => {
        const code = data.code;
        if (code && last_error.indexOf(code) < 0) {
          last_error[1] = code;
          handleError({ data });
        }
      });
    }
  });
}
