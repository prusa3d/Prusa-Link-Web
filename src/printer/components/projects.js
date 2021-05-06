// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson, getImage } from "../../auth.js";
import { navigate } from "../../router.js";
import { handleError } from "./errors";
import { getValue } from "./updateProperties.js";
import formatData from "./dataFormat.js";
import upload from "../components/upload";
import { translate, translateLabels } from "../../locale_provider.js";
import { setBusy, clearBusy } from "./busy";
import { states, to_page } from "./state";

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
  if (a.type == "folder" && b.type == "folder") {
    return b.date - a.date;
  } else if (a.type == "folder") {
    return -1;
  } else if (b.type == "folder") {
    return 1;
  }
  return b.date - a.date;
};

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
      if (data) {
        metadata.files = data.files;
        metadata.free = data.free;
        metadata.total = data.total;
        metadata.eTag = result.eTag;
        if (metadata.firstTime) {
          metadata.firstTime = false;
          clearBusy();
        }
        load();
      }
    })
    .catch((result) => handleError(result));
};

/**
 * update project page
 * @param {object} context
 */
export const update = (context) => {
  if (
    [states.READY, states.ERROR, states.ATTENTION].indexOf(context.state) < 0
  ) {
    to_page(context.state);
    return;
  }
  if (metadata.firstTime) {
    setBusy();
  }
  updateData();
};

/**
 * load projects page
 */
export function load() {
  upload.init();
  const projects = document.getElementById("projects");
  while (projects.firstChild) {
    projects.removeChild(projects.firstChild);
  }

  let view = metadata.files;
  if (metadata.current_path.length > 1) {
    const origin = metadata.current_path[0];
    for (let i = 1; i < metadata.current_path.length; i++) {
      let path = metadata.current_path[i];
      view = view.find((elm) => elm.name == path && elm.origin == origin)
        .children;
    }
    document.getElementById(
      "title-status-label"
    ).innerHTML = metadata.current_path.join(" > ");
    projects.appendChild(createUp());
  } else {
    document.getElementById("title-status-label").innerHTML = translate(
      "proj.title"
    );
  }

  if (view.length > 0) {
    for (let node of view.sort(sortByType)) {
      if (node.type == "folder") {
        projects.appendChild(createFolder(node));
      } else {
        projects.appendChild(createFile(node));
        // update medatada in backend
        getJson(node.refs.resource, {
          headers: {
            "Content-Type": "application/json",
          },
        });
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
 */
function createFolder(node) {
  return createElement("node-folder", node.name, () => {
    if (metadata.current_path.length == 0) {
      metadata.current_path.push(node.origin);
    }
    metadata.current_path.push(node.name);
    load();
  });
}

/**
 * create a up button element
 */
function createUp() {
  const title =
    metadata.current_path.length == 1 ? translate("proj.main") : "..";
  return createElement("node-up", title, () => {
    metadata.current_path.pop();
    if (metadata.current_path.length == 1) {
      metadata.current_path.pop();
    }
    load();
  });
}

/**
 * callback when click on file element
 * @param {object} node
 */
const onClickFile = (node) => {
  setBusy();
  getJson(node.refs.resource, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command: "select" }),
  })
    .then((result) => clearBusy())
    .catch((result) => {
      clearBusy();
      handleError(result);
    });
};

/**
 * Create a file element
 * @param {object} node
 */
function createFile(node) {
  const elm = createElement("node-project", node.name, (e) =>
    onClickFile(node)
  );
  const nodeDetails = elm.querySelector(".node-details");
  nodeDetails.querySelectorAll(".details").forEach((element) => {
    translateLabels(element);
    const value = getValue(element.dataset.where, node);
    if (value) {
      const data = formatData(element.dataset.format, value);
      element.querySelector("p").innerHTML += ` <span>${data}</span>`;
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

export const navigateToProjects = () => {
  document.title = process.env.TITLE + " - " + translate("proj.link");
  history.pushState(null, document.title, "#projects");
  navigate("#projects");
};

export const findNode = (origin, path) => {
  const current_path = path.split("/");
  let view = metadata.files;
  let parent = view;
  let index = -1;

  if (Object.keys(view).length === 0) {
    return [parent, index];
  }

  for (let i = 0; i < current_path.length; i++) {
    let _path = current_path[i];
    index = view.findIndex((elm) => elm.name == _path && elm.origin == origin);
    if (i < current_path.length - 1) {
      parent = view[index];
      view = parent.children;
    }
  }

  return [parent, index];
};

export const removeProject = (origin, path) => {
  const [parent, index] = findNode(origin, path);
  if (index < 0) {
    return;
  }

  if (Array.isArray(parent)) {
    parent.splice(index, 1);
  } else {
    parent.children.splice(index, 1);
    if (!parent.children.length) {
      removeProject(origin, parent.path);
      metadata.current_path.pop();
    }
  }
};

export default { load, update };
