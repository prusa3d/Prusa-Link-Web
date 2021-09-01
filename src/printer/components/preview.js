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
import { setBusy, clearBusy } from "./busy";
import { states, to_page } from "./state";
import { removeProject } from "./projects";

const createConfirm = (close) => {
  const template = document.getElementById("modal-confirm");
  const node = document.importNode(template.content, true);
  const yesButton = node.getElementById("yes");
  yesButton.addEventListener("click", (event) => {
    event.preventDefault();
    setBusy();
    confirmJob().then(() => {
      close();
      clearBusy();
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
    getJson(`/api/files/${path}`)
      .then((result) => {
        const file = result.data;

        if (file.refs && file.refs.thumbnailBig) {
          const img = document.getElementById("preview-img");
          getImage(file.refs.thumbnailBig).then((url) => {
            img.src = url;
          });
        }

        if (process.env.MODE == "development") {
          if (!file.refs.resource)
            console.error("Reference to file resource is null!");
        }

        document.getElementById("start").disabled = false;
        document.getElementById("delete").disabled = false;

        /**
         * set up delete button
         */
        document.getElementById("delete").onclick = function (e) {
          doQuestion({
            title: translate("proj.del"),
            // TODO: add strong - Do you really want to delete <strong>${file.name}</strong>?
            questionChildren: translate("msg.del-proj", {
              file_name: file.name,
            }),
            yes: (close) => {
              getJson(file.refs.resource, { method: "DELETE" })
                .then(() => removeProject(jobFile.origin, jobFile.path))
                .catch((result) => handleError(result))
                .finally((result) => close());
            },
            next: "#projects",
          });
          e.preventDefault();
        };

        /**
         * set up confirm button
         */
        document.querySelector(".yes").onclick = function (e) {
          modal(createConfirm, {
            timeout: 10000,
            closeOutside: false,
          });
          e.preventDefault();
        };
      })
      .catch((result) => handleError(result))
      .finally(() => {
        /**
         * set up cancel button
         */
        document.getElementById("cancel").onclick = function (e) {
          setBusy();
          getJson("/api/job", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ command: "cancel" }),
          })
            .catch((result) => handleError(result))
            .finally((result) => {
              clearBusy();
              navigate("#projects");
            });
          e.preventDefault();
        };
      });
  });
};

/**
 * update preview
 * @param {object} context
 */
const update = (context) => {
  if (context.state != states.SELECTED) {
    to_page(context.state);
  } else {
    load();
  }
};

export default { load, update };
