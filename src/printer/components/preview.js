// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson, getImage } from "../../auth";
import { handleError } from "./errors";
import { updateProperties } from "./updateProperties.js";
import { navigate } from "../../router.js";
import { modal } from "./modal.js";
import { confirmJob } from "./job.js";
import { doQuestion } from "./question";

/**
 * load preview
 */
const load = () => {
  getJson("/api/job").then((result) => {
    const data = result.data;
    console.log(data);
    const file = data.job.file;
    updateProperties("preview", data);
    if (file.refs.thumbnailBig) {
      const img = document.getElementById("preview-img");
      getImage(file.refs.thumbnailBig).then((url) => {
        img.src = url;
      });
    }

    /**
     * set up cancel button
     */
    document.getElementById("cancel").addEventListener("click", (e) => {
      navigate("#loading");
      getJson("/api/job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command: "cancel" }),
      })
        .catch((result) => handleError(result))
        .finally((result) => navigate("#projects"));
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
          getJson(file.refs.resource, { method: "DELETE" })
            .catch((result) => handleError(result))
            .finally((result) => close());
        },
        next: "#projects",
      });
      e.preventDefault();
    });

    /**
     * set up change exposure times button (sla)
     */
    if (process.env.PRINTER_FAMILY == "sla") {
      require("../sl1/exposure").default(file);
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
  });
};

/**
 * update preview
 * @param {object} context
 */
const update = (context) => {
  const flags = context.printer.state.flags;
  if (flags.printing) {
    if (!flags.ready) {
      if (process.env.PRINTER_FAMILY == "sla") {
        if (flags.pausing || flags.paused) {
          navigate("#refill");
        } else {
          navigate("#job");
        }
      } else {
        navigate("#job");
      }
    }
  } else {
    navigate("#projects");
  }
};

export default { load, update };
