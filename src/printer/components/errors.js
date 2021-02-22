// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { error } from "./toast";

/**
 * Pop up an error message.
 * @param {object} data
 */
export const errorFormat = (data) => {
  const title = `${data.title} - ${data.code}`;
  const message =
    data.message +
    `<br/><a href="${
      "https://help.prusa3d.com/en/" + data.code.replace("#", "")
    }">more info</a>`;
  error(title, message);
};

/**
 * common interface for handling errors from requests
 * @param {object} status
 * @param {object} data
 */
export function handleError(status, data) {
  if (!status.ok) {
    errorFormat(data);
  }
}
