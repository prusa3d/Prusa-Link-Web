// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { updateProperties } from "../components/updateProperties.js";
import { errorFormat } from "../components/errors.js";

const update = (data) => {
  updateProperties("job", data);
};

export const load = () => {
  getJson("/api/job", (status, data) => {
    if (status.ok) {
      const completion = data.progress.completion;
      if (completion) {
        document.querySelector("progress").value = completion;
      }
      update(data);
    } else {
      errorFormat(status, data);
    }
  });
};

export default { load, update };
