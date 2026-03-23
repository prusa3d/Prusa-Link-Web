// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { handleError } from "./errors";

/**
 * Get printer ready state.
 */
export const getReadyState = () => {
  return getJson("/api/v1/ready")
    .then((response) => response.data)
    .catch((result) => {
      handleError(result);
      return { ready: false };
    });
}

/**
 * Set printer as ready.
 */
export const setReady = () => {
  return getJson("/api/v1/ready", {
    method: "PUT",
  }).catch((result) => handleError(result));
}

/**
 * Unset printer ready state.
 */
export const unsetReady = () => {
  return getJson("/api/v1/ready", {
    method: "DELETE",
  }).catch((result) => handleError(result));
}
