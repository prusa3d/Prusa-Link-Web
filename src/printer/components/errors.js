// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { error } from "./toast";

/**
 * common interface for handling errors from requests
 * @param {object} data
 */
export function handleError(result) {
  const data = result.data;
  if (data) {
    const title = `${data.title} - ${data.code}`;
    const message =
      data.message +
      `<br/><a href="${
        "https://help.prusa3d.com/en/" + data.code.replace("#", "")
      }">more info</a>`;
    error(title, message);
  }
}
