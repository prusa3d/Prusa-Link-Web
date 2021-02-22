// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth.js";
import { navigate } from "../../router.js";
import { errorFormat, handleError } from "./errors";
import { getValue } from "./updateProperties.js";
import formatData from "./dataFormat.js";

/**
 * project context
 */
const metadata = {
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
    return a.display.localeCompare(b.display);
  } else if (a.type == "folder") {
    return -1;
  }
  return 1;
};

/**
 * callback for update the project context
 * @param {object} status
 * @param {object} data
 */
const updateData = (status, data) => {
  if (status.code != 304) {
    if (status.ok) {
      metadata.files = {
        local: data.files.filter((elm) => elm.origin == "local"),
        usb: data.files.filter((elm) => elm.origin == "sdcard"),
      };
      metadata.free = data.free;
      metadata.total = data.total;
      metadata.eTag = status.eTag;
      metadata.firstTime = false;
      if (window.location.hash == "#projects") {
        navigate("#projects");
      }
    } else {
      errorFormat(data);
    }
  }
};

/**
 * update project page
 * @param {object} context
 */
export const update = (context) => {
  if (context.printer.state.flags.printing) {
    if (context.printer.state.flags.ready) {
      navigate("#preview");
    } else {
      navigate("#job");
    }
  } else {
    getJson("/api/files?recursive=true", updateData, {
      headers: { "If-None-Match": metadata.eTag },
    });
    if (metadata.firstTime) {
      navigate("#loading");
    }
  }
};

/**
 * load projects page
 */
export function load() {
  const projects = document.getElementById("projects");
  while (projects.firstChild) {
    projects.removeChild(projects.firstChild);
  }

  if (metadata.current_path.length > 0) {
    let view = metadata.files[metadata.current_path[0]];
    for (let i = 1; i < metadata.current_path.length; i++) {
      let path = metadata.current_path[i];
      view = view.find((elm) => elm.name == path).children;
    }

    document.getElementById("title").innerHTML = metadata.current_path.join(
      " > "
    );
    projects.appendChild(createUp());
    for (let node of view.sort(sortByType)) {
      if (node.type == "folder") {
        projects.appendChild(createFolder(node.display));
      } else {
        projects.appendChild(createFile(node));
      }
    }
  } else {
    for (let name in metadata.files) {
      document.getElementById("title").innerHTML = "Project files";
      projects.appendChild(createFolder(name));
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
 */
function createFolder(name) {
  return createElement("node-folder", name, () => {
    metadata.current_path.push(name);
    load();
  });
}

/**
 * create a up button element
 */
function createUp() {
  return createElement("node-up", "Main", () => {
    metadata.current_path.pop();
    load();
  });
}

/**
 * callback when click on file element
 * @param {object} node
 */
const onClickFile = (node) => {
  navigate("#loading");
  getJson(node.refs.resource, handleError, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command: "select" }),
  }).finally(() => {
    navigate("#projects");
  });
};

/**
 * Create a file element
 * @param {object} node
 */
function createFile(node) {
  const elm = createElement("node-project", node.display, (e) =>
    onClickFile(node)
  );
  const nodeDetails = elm.querySelector(".node-details");
  nodeDetails.querySelectorAll(".details").forEach((element) => {
    const value = getValue(element.dataset.where, node);
    if (value) {
      element.querySelector("span").innerHTML = formatData(
        element.dataset.format,
        value
      );
    } else {
      nodeDetails.removeChild(element);
    }
  });
  if (node.refs.thumbnailBig) {
    elm.querySelector("img.node-img").src = node.refs.thumbnailBig;
  }
  return elm;
}

export default { load, update };
