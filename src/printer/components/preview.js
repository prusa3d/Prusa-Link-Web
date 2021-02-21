// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { errorFormat, handleError } from "./errors";
import { updateProperties } from "./updateProperties.js";
import { navigate } from "../../router.js";
import { modal } from "./modal.js";
import { confirmJob } from "./job.js";
import { doQuestion } from "./question";

const pending = () => {
  document.querySelector(".preview").toggleAttribute("hidden");
  document.querySelector(".pending").toggleAttribute("hidden");
};

const onRespond = (status, data) => {
  pending();
  handleError(status, data);
};

const load = () => {
  getJson("/api/job", (status, data) => {
    if (status.ok) {
      const file = data.job.file;
      updateProperties("preview", data);
      if (file.refs.thumbnailBig) {
        document.getElementById("preview-img").src = file.refs.thumbnailBig;
      }

      document.getElementById("cancel").addEventListener("click", (e) => {
        pending();
        getJson("/api/job", onRespond, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ command: "cancel" }),
        });
        e.preventDefault();
      });

      document.getElementById("delete").addEventListener("click", (e) => {
        doQuestion({
          title: "Delete File",
          questionChildren: `Do you really want to delete <strong>${file.name}</strong>?`,
          yes: (close) => {
            const resp = (status, data) => {
              close();
              handleError(status, data);
            };
            getJson(file.refs.resource, resp, { method: "DELETE" });
          },
          next: "#projects",
        });
        e.preventDefault();
      });

      if (process.env.PRINTER_FAMILY == "sla") {
        require("./exposure").default(file);
      }

      document.querySelector(".yes").addEventListener("click", (e) => {
        modal("confirm", {
          timeout: 10000,
          closeOutside: false,
          events: {
            click: {
              yes: (event, close) => {
                event.preventDefault();
                pending();
                confirmJob().then(() => {
                  close();
                  pending();
                });
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
