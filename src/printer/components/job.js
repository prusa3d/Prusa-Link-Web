// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth.js";
import { handleError } from "./errors";
import { info } from "./toast";

export function confirmJob() {
  info("Start print", "The printer is getting ready.");
  return getJson("/api/job", handleError, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command: "start" }),
  });
}
