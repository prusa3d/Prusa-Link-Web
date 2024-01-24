// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { handleError } from "../components/errors";
import { resumeJob } from "../components/jobActions";

export const resinRefill = (jobId) => {
  getJson("/api/system/commands/custom/resinrefill", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    }
  }).then(() => {
    resumeJob(jobId);
  }).catch((result) => handleError(result));
};

export default { resinRefill };
