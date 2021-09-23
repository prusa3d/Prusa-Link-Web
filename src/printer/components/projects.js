// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import formatData from "./dataFormat.js";
import joinPaths from "../../helpers/join_paths";
import upload from "../components/upload";
import { getJson, getImage } from "../../auth.js";
import { getValue } from "./updateProperties.js";
import { handleError } from "./errors";
import { navigate } from "../../router.js";
import { translate, translateLabels } from "../../locale_provider.js";
import { deleteProject, downloadProject } from "./projectActions.js";
import printer from "../index";
import { error } from "./toast.js";
import { cancelPreview } from "./jobActions";
import scrollIntoViewIfNeeded from "../../helpers/scroll_into_view_if_needed.js";
import * as job from "./job";

let lastData = null;

/**
 * project context
 */
const metadata = {
  origin: "",
  current_path: [],
  files: {},
  eTag: null,
  free: 0,
  total: 0,
  firstTime: true,
};

const getInitialMetadataFiles = (data) => {
  if (process.env.PRINTER_TYPE === "fdm") {
    return data.files;
  } else {
    return [
      {
        name: "local",
        origin: "local",
        path: "/local",
        type: "folder",
        children: data.files.filter((elm) => elm.origin === "local"),
      },
      {
        name: "sdcard",
        origin: "sdcard",
        path: "/sdcard",
        type: "folder",
        children: data.files.filter((elm) => elm.origin === "sdcard"),
      },
    ];
  }
}

/**
 * callback for update the project context
 * @param {object} status
 * @param {object} data
 */
const updateData = () => {
  getJson("/api/files?recursive=true", {
    headers: { "If-None-Match": metadata.eTag },
  })
    .then((result) => {
      const data = result.data;
      const newData = JSON.stringify(data);
      if (data && lastData !== newData) {
        lastData = newData;
        metadata.files = getInitialMetadataFiles(data);
        metadata.free = data.free;
        metadata.total = data.total;
        metadata.eTag = result.eTag;
        metadata.firstTime = false;
        if (window.location.hash === "#projects") {
          navigate("#projects");
        }
      }
    })
    .catch((result) => handleError(result));
};

/**
 * update project page
 * @param {object} context
 */
export const update = (context) => {
  if (metadata.firstTime) {
    navigate("#loading");
  }
  updateData();
  job.update(context);
  upload.update();
};

function initUpload() {
  const origin = metadata.origin;
  const path = joinPaths(getCurrentPath());
  upload.init(origin, path);
}

/**
 * load projects page
 */
export function load(context) {
  if (context)
    job.update(context);

  const projects = document.getElementById("projects");
  while (projects.firstChild) {
    projects.removeChild(projects.firstChild);
  }

  if (metadata.current_path.length === 0)
    metadata.origin = "local";
  initUpload();

  if (metadata.current_path.length > 0) {
    let view = metadata.files.find((elm) => elm.name === metadata.current_path[0]).children;
    for (let i = 1; i < metadata.current_path.length; i++) {
      let path = metadata.current_path[i];
      view = view.find((elm) => elm.name === path).children;
    }

    document.getElementById(
      "title-status-label"
    ).innerHTML = metadata.current_path.join(" > ");

    projects.appendChild(createUp());
    for (let node of view) {
      if (node.type === "folder") {
        projects.appendChild(createFolder(node.display || node.name, node.path));
      } else {
        projects.appendChild(createFile(node));
      }
    }
  } else {
    document.getElementById("title-status-label").innerHTML = translate("proj.title");
    if (metadata.files.length) {
      for (let file of metadata.files) {
        if (file.type === "folder") {
          projects.appendChild(createFolder(file.name, joinPaths(file.path), file.origin));
        } else {
          projects.appendChild(createFile(file));
        }
      }
    }
  }
}

/**
 * Create a element folder / file / up buttons
 * @param {string} templateName - type
 * @param {string} name - title
 * @param {function} cb - callback when click
 */
function createElement(templateName, name, cb) {
  const templateFolder = document.getElementById(templateName).content;
  const elm = document.importNode(templateFolder, true);
  elm.querySelector(".node").addEventListener("click", (e) => {
    cb(e);
    e.preventDefault();
  });
  elm.querySelector("p").appendChild(document.createTextNode(name));
  return elm;
}

/**
 * Create a folder element
 * @param {string} name
 * @param {string} path
 * @param {string|undefined} origin (optimal)
 */
function createFolder(name, path, origin) {
  return createElement("node-folder", name, () => {
    if (origin)
      metadata.origin = origin;

    if (!origin && process.env.PRINTER_TYPE === "sla") {
      metadata.current_path = [metadata.origin, ...path.split("/").filter(str => str !== "")];
    } else {
      metadata.current_path = path.split("/").filter(str => str !== "");
    }
    load();
  });
}

/**
 * create a up button element
 */
function createUp() {
  const title = metadata.current_path.length === 1 ? translate("proj.main") : "..";
  return createElement("node-up", title, () => {
    metadata.current_path.pop();
    load();
  });
}

/**
 * callback when click on file element
 * @param {object} node
 */
const onClickFile = (node) => {
  const paths = getNodeFilePaths(node.name);
  const url = joinPaths("api/files", paths);

  const flags = printer.getContext().printer.state.flags;
  if (flags.printing) {
    if (flags.ready) {
      cancelPreview().then(() => selectPreview(url));
    } else {
      error("Can't preview project", "Printer is printing!");
    }
  } else {
    selectPreview(url);
  }
};

function selectPreview(url) {
  console.log("Select preview");
  return getJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command: "select" }),
  })
    .then((result) => {
      job.update(printer.getContext());
      const jobElement = document.getElementById("job");
      if (jobElement) {
        scrollIntoViewIfNeeded(jobElement);
      }
    })
    .catch((result) => {
      handleError(result);
    });
}

/**
 * Create a file element
 * @param {object} node
 */
function createFile(node) {
  const elm = createElement("node-project", node.display || node.name, (e) =>
    onClickFile(node)
  );
  const nodeDetails = elm.querySelector(".node-details");
  nodeDetails.querySelectorAll(".details").forEach((element) => {
    translateLabels(element);
    const value = getValue(element.dataset.where, node);
    if (value) {
      const data = formatData(
        element.dataset.format,
        value
      );
      element.querySelector("p").innerHTML += ` <span>${data}</span>`
    } else {
      nodeDetails.removeChild(element);
    }
  });
  if (node.refs && node.refs.thumbnailBig) {
    const img = elm.querySelector("img.node-img");
    getImage(node.refs.thumbnailBig).then((url) => {
      img.src = url;
    });
  }

  setupFileButtons(node, elm);
  return elm;
}

function setupFileButtons(node, elm) {
  // Setup buttons
  const paths = getNodeFilePaths(node.name);
  const fileUrl = joinPaths("/api/files/", ...paths);

  const deleteBtn = elm.querySelector("#delete");
  const downloadBtn = elm.querySelector("#download");
  getJson(fileUrl).then((result) => {
    const file = result.data;

    if (deleteBtn) {
      deleteBtn.disabled = !(file.refs && file.refs.resource);
      deleteBtn.onclick = (e) => {
        deleteProject(file);
        e.stopPropagation();
      }
    }
    if (downloadBtn) {
      downloadBtn.disabled = !(file.refs && file.refs.download);
      downloadBtn.onclick = (e) => {
        downloadProject(file);
        e.stopPropagation();
      }
    }
  }).catch(() => { });
}

/**
 * Get current path. Not include origin.
 * For SlA without "local" or "sdcard"
 * For FDM without "Prusa Link gcodes" or "SD Card"
 */
function getCurrentPath() {
  return metadata.current_path.slice(1, metadata.current_path.length);
}

function getNodeFilePaths(nodeName) {
  const paths = [
    metadata.origin,
    ...(process.env.PRINTER_TYPE === "fdm" ? metadata.current_path : getCurrentPath()),
    nodeName
  ];
  return paths;
}

export default { load, update };
