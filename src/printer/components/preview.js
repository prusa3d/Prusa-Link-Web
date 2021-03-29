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
import joinPaths from "../../helpers/join_paths";

const createConfirm = (close) => {
  const template = document.getElementById("modal-confirm");
  const node = document.importNode(template.content, true);
  const yesButton = node.getElementById("yes");
  yesButton.addEventListener("click", (event) => {
    event.preventDefault();
    navigate("#loading");
    confirmJob().then(() => {
      close();
      navigate("#projects");
    });
  });
  const noButton = node.getElementById("no");
  noButton.addEventListener("click", close);
  return node;
};

/**
 * load preview
 */
const load = () => {
  translate("proj.title", { query: "#title-status-label" });
  getJson("/api/job").then((result) => {
    const data = result.data;
    const jobFile = data.job.file;
    const path = joinPaths(jobFile.origin, jobFile.path);

    updateProperties("preview", data);
    getJson(`/api/files/${path}`).then((result) => {
      const file = result.data;

      if (file.refs && file.refs.thumbnailBig) {
        const img = document.getElementById("preview-img");
        getImage(file.refs.thumbnailBig).then((url) => {
          img.src = url;
        });
      }

      if (!file.refs.resource)
        console.error("Reference to file resource is null!");

      document.getElementById("start").disabled = false; // !file.refs.resource;
      document.getElementById("delete").disabled = !file.refs.resource;

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
        require("../sl1/exposure").default(jobFile);
      }

      /**
       * set up confirm button
       */
      document.querySelector(".yes").addEventListener("click", (e) => {
        modal(createConfirm, {
          timeout: 10000,
          closeOutside: false,
        });
        e.preventDefault();
      });
    })
      .catch((result) => handleError(result))
      .finally(() => {
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
          return;
        }
      }
      navigate("#job");
      return;
    }
  } else {
    navigate("#projects");
  }
};

export default { load, update };
