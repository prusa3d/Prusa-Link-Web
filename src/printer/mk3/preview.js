// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import formatData from "../components/dataFormat";
import { loadProperty, handleError } from "../components/miscellaneous.js.js";
import { navigate } from "../../router.js";

const load = () => {
  console.log("Preview Logic - sl1");

  getJson("/api/job", (status, data) => {
    if (status.ok) {
      const file = data.job.file;
      document.getElementById("preview-name").innerHTML = file.name;

      // prettier-ignore
      loadProperty("preview-times", "Print Time Estimate",formatData("time", data.job.estimatedPrintTime));
      // prettier-ignore
      loadProperty("preview-times", "Estimated end", formatData("dateOffset", { remaining_time: data.job.estimatedPrintTime, offset: "+0100",})  );
      // prettier-ignore
      loadProperty("preview-dates", "Last Modified",  formatData("date", file.date));

      document.getElementById("cancel").addEventListener("click", (e) => {
        getJson("/api/job", handleError, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ command: "cancel" }),
        });
        e.preventDefault();
      });
    } else {
      console.error(`Cant get printer API! Error ${status.code}`);
      console.error(data);
    }
  });
};

const update = (context) => {
  if (!context.printer.state.flags.printing) {
    navigate("#projects");
  }
};

export default { load, update };
