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
import { translate } from "../../locale_provider";

/**
 * load preview
 */
const load = () => {
  translate("proj.title", { query: "#title" });
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
        title: translate("proj.del"),
        // TODO: add strong - Do you really want to delete <strong>${file.name}</strong>?
        questionChildren: translate("msg.del-proj", { file_name: file.name }),
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

  translate("prop.time-est", { query: `[data-label="prop.time-est"]`});
  translate("prop.est-end", { query: `[data-label="prop.est-end"]`});
  translate("prop.layers", { query: `[data-label="prop.layers"]`});
  translate("prop.layer-ht", { query: `[data-label="prop.layer-ht"]`});
  translate("prop.exp-times", { query: `[data-label="prop.exp-times"]`});
  translate("prop.last-mod", { query: `[data-label="prop.last-mod"]`});

  translate("btn.del", { query: "#delete p" });
  translate("btn.start-pt", { query: "#start p" });
  translate("btn.chg-exp", { query: "#exposure p" });
  translate("btn.cancel", { query: "#cancel p" });
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
