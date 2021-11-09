// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { handleError } from "./errors";

/**
 * Edit user. Need password to change.
 */
export const editUser = (password, { username, newPassword, rePassword }) => {
  return getJson("/api/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user: {
        password,
        username,
        new_password: newPassword,
        new_repassword: rePassword
      }
    }),
  });
}

/**
 * Edit printer.
 */
export const editPrinter = (name, location) => {
  return getJson("/api/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      printer: {
        name,
        location,
      }
    }),
  });
}

/**
 * Get serial number. Serial can be null or "".
 */
export const getSerialNumber = () => {
  return getJson("/api/settings/sn", {
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * If printer is in SN error, user can insert new SN
 */
export const editSerialNumber = (serial) => {
  return getJson("/api/settings/sn", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      serial,
    }),
  });
}
