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

/**
 * Show error if happens and disable loading page
 * @param {object} status
 * @param {object} data
 */
const onRespond = (status, data) => {
  navigate("#projects");
  handleError(status, data);
};

/**
 * load preview
 */
const load = () => {
  getJson("/api/job", (status, data) => {
    if (status.ok) {
      const file = data.job.file;
      updateProperties("preview", data);
      if (file.refs.thumbnailBig) {
        document.getElementById("preview-img").src = file.refs.thumbnailBig;
      }

      /**
       * set up cancel button
       */
      document.getElementById("cancel").addEventListener("click", (e) => {
        navigate("#loading");
        getJson("/api/job", onRespond, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ command: "cancel" }),
        });
        e.preventDefault();
      });

      /**
       * set up delete button
       */
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

      /**
       * set up change exposure times button (sla)
       */
      if (process.env.PRINTER_FAMILY == "sla") {
        require("./exposure").default(file);
      }

      /**
       * set up confirm button
       */
      document.querySelector(".yes").addEventListener("click", (e) => {
        modal("confirm", {
          timeout: 10000,
          closeOutside: false,
          events: {
            click: {
              yes: (event, close) => {
                event.preventDefault();
                navigate("#loading");
                confirmJob().then(() => {
                  close();
                  navigate("#projects");
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

/**
 * update preview
 * @param {object} context
 */
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
