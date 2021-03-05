// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import formatData from "./dataFormat.js";
import upload from "../components/upload";
import { getJson, getImage } from "../../auth.js";
import { getValue } from "./updateProperties.js";
import { handleError } from "./errors";
import { navigate } from "../../router.js";
import { translate, translateLabels } from "../../locale_provider.js";

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

/**
 * Sort projects by type and name
 * @param {object} a
 * @param {object} b
 */
const sortByType = (a, b) => {
  if (a.type == b.type) {
    let aName = a.display || a.name || "";
    let bName = b.display || b.name || "";

    return aName.localeCompare(bName);
  } else if (a.type == "folder") {
    return -1;
  } else if (b.type == "folder") {
    return 1;
  }
  return b.date - a.date;
};

const getInitialMetadataFiles = (data) => {
  return [
    {
      name: "local",
      origin: "local",
      path: "/local",
      type: "folder",
      children: data.files.filter((elm) => elm.origin == "local"),
    },
    {
      name: "sdcard",
      origin: "sdcard",
      path: "/sdcard",
      type: "folder",
      children: data.files.filter((elm) => elm.origin == "sdcard"),
    },
  ];
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
        if (window.location.hash == "#projects") {
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
  const flags = context.printer.state.flags;
  if (flags.printing) {
    if (flags.ready) {
      navigate("#preview");
    } else {
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
    if (metadata.firstTime) {
      navigate("#loading");
    }
    updateData();
  }
};

function initUpload() {
  const origin = metadata.origin;
  const path = joinPaths(...getCurrentPath());
  upload.init(origin, path);
}

/**
 * load projects page
 */
export function load() {
  const projects = document.getElementById("projects");
  while (projects.firstChild) {
    projects.removeChild(projects.firstChild);
  }

  if (metadata.current_path.length === 0)
    metadata.origin = "local";
  initUpload();

  if (metadata.current_path.length > 0) {
    let view = metadata.files.find((elm) => elm.name == metadata.current_path[0]).children;
    for (let i = 1; i < metadata.current_path.length; i++) {
      let path = metadata.current_path[i];
      view = view.find((elm) => elm.name == path).children;
    }

    document.getElementById(
      "title-status-label"
    ).innerHTML = metadata.current_path.join(" > ");

    projects.appendChild(createUp());
    for (let node of view.sort(sortByType)) {
      if (node.type == "folder") {
        projects.appendChild(createFolder(node.display || node.name, node.path));
      } else {
        projects.appendChild(createFile(node));
      }
    }
  } else {
    document.getElementById("title-status-label").innerHTML = translate("proj.title");
    if (metadata.files.length) {
      for (let file of metadata.files) {
        if (file.type == "folder") {
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
    if (origin) {
      metadata.origin = origin;
      metadata.current_path = path.split("/").filter(str => str !== "");
    } else {
      metadata.current_path = [metadata.origin, ...path.split("/").filter(str => str !== "")];
    }

    load();
  });
}

/**
 * create a up button element
 */
function createUp() {
  return createElement("node-up", translate("proj.main"), () => {
    metadata.current_path.pop();
    load();
  });
}

/**
 * callback when click on file element
 * @param {object} node
 */
const onClickFile = (node) => {
  const paths = [metadata.origin, ...getCurrentPath(), node.name]
  const url = joinPaths("api/files", ...paths);
  console.log(`Request file: ${url}`);

  navigate("#loading");
  getJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command: "select" }),
  })
    .then((result) => navigate("#preview"))
    .catch((result) => {
      navigate("#projects");
      handleError(result);
    });
};

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
  if (node.refs.thumbnailBig) {
    const img = elm.querySelector("img.node-img");
    getImage(node.refs.thumbnailBig).then((url) => {
      img.src = url;
    });
  }
  return elm;
}

/**
 * Get current path. Not include origin.
 * For Sl1 without "local" or "sdcard"
 */
function getCurrentPath() {
  return metadata.current_path.slice(1, metadata.current_path.length);
}

function joinPaths(...segments) {
  return segments.map(str => {
    if (str[0] === '/') {
      str = str.substring(1);
    }
    if (str[str.length - 1] === "/") {
      str = str.substring(0, str.length - 1);
    }
    return str;
  }).filter(str => str !== "").join("/");
}

export default { load, update };
