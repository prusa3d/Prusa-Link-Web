// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { errorFormat, handleError } from "./errors";
import { updateProperties } from "./updateProperties.js";
import { navigate } from "../../router.js";
import { modal } from "./modal.js";
import { confirmJob } from "./job.js";

const load = () => {
  getJson("/api/job", (status, data) => {
    if (status.ok) {
      const file = data.job.file;
      document.getElementById("preview-name").innerHTML = file.name;
      updateProperties("preview", data);

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

      document.getElementById("delete").addEventListener("click", (e) => {
        console.log("delete");
        e.preventDefault();
      });

      if (process.env.PRINTER_FAMILY == "sla") {
        document.querySelector(".action").addEventListener("click", (e) => {
          console.log("action");
          e.preventDefault();
        });
      }

      document.querySelector(".yes").addEventListener("click", (e) => {
        modal("confirm", {
          timeout: 10000,
          closeOutside: false,
          events: {
            click: {
              yes: (event, close) => {
                event.preventDefault();
                confirmJob().then(() => close());
              },
              no: (event, close) => {
                event.preventDefault();
                close();
              },
            },
          },
        });
        e.preventDefault();
      });
    } else {
      errorFormat(data);
    }
  });
};

const update = (context) => {
  if (context.printer.state.flags.printing) {
    if (!context.printer.state.flags.ready) {
      navigate("#job");
    }
  } else {
    navigate("#projects");
  }
};

export default { load, update };
