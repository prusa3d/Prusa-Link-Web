// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getHeaders } from "../../auth.js";
import { navigate } from "../../router.js";

const metadata = {
  current_view: null,
  container: null,
  files: [],
  eTag: null,
  free: 0,
  total: 0,
};

const sortByType = (a, b) => {
  if (a.type == b.type) {
    return a.display.localeCompare(b.display);
  } else if (a.type == "folder") {
    return -1;
  }
  return 1;
};

const newContainer = () => {
  const allFiles = {
    display: "Main",
    type: "folder",
    children: [],
  };
  const local = {
    path: ["local"],
    display: "local",
    type: "folder",
    parent: allFiles,
  };
  const sdcard = {
    path: ["sdcard"],
    display: "usb",
    type: "folder",
    parent: allFiles,
  };
  allFiles.children.push(local);
  allFiles.children.push(sdcard);
  return { allFiles, local, sdcard };
};

const parse = (parent, node) => {
  let newNode = {};
  // parent["*" + node.name] = newNode;
  newNode.path = [...parent.path, node.name];
  newNode.display = node.display;
  newNode.parent = parent;
  parent.children = parent.children || [];
  parent.children.push(newNode);
  if (node.type == "folder") {
    newNode.type = "folder";
    for (let child of node.children.sort(sortByType)) {
      parse(newNode, child);
    }
  } else {
    newNode.type = "file";
    for (let property of ["gcodeAnalysis", "refs"]) {
      if (node[property]) {
        newNode = Object.assign(newNode, node[property]);
      }
    }
  }
};

export async function update() {
  try {
    const options = Object.assign(
      { "If-None-Match": metadata.eTag },
      getHeaders()
    );
    await fetch("/api/files?recursive=true", options)
      .then((response) => {
        metadata.eTag = response.headers.get("etag");
        return response.json();
      })
      .then((data) => {
        const context = newContainer();
        for (let node of data.files.sort(sortByType)) {
          parse(context[node.origin], node);
        }
        metadata.container = context.allFiles;
        show();
      })
      .catch((e) => {
        throw e;
      });
  } catch (err) {
    // TODO ERROR HANDLING
    console.log(err);
  }
}
function showFile(elm, node) {
  elm.querySelector(".node").addEventListener("click", (e) => {
    metadata.current_view = node;
    navigate("#preview");
    e.preventDefault();
  });
  elm.querySelector("p").appendChild(document.createTextNode(node.display));
  const nodeDetails = elm.querySelector(".node-details");
  for (let property of ["printTime", "material", "layerHeight"]) {
    let element = elm.getElementById(property);
    if (node[property] != undefined) {
      let span = document.createElement("span");
      span.innerHTML = node[property];
      element.querySelector("p").appendChild(span);
    } else {
      nodeDetails.removeChild(element);
    }
  }
}

function showFolder(elm, node) {
  elm.querySelector(".node").addEventListener("click", (e) => {
    metadata.current_view = node;
    show();
    e.preventDefault();
  });
  elm.querySelector("p").appendChild(document.createTextNode(node.display));
}

function showUp(elm, node) {
  elm.querySelector(".node").addEventListener("click", (e) => {
    metadata.current_view = node;
    show();
    e.preventDefault();
  });
  elm.querySelector("p").appendChild(document.createTextNode(node.display));
}

export function show() {
  const view = metadata.current_view || metadata.container;
  const projects = document.querySelector(".projects");

  while (projects.firstChild) {
    projects.removeChild(projects.firstChild);
  }

  if (view.type == "folder") {
    const templateFolder = document.getElementById("node-folder").content;
    const templateProject = document.getElementById("node-project").content;

    if (view.parent) {
      const templateUp = document.getElementById("node-up").content;
      const elm = document.importNode(templateUp, true);
      showUp(elm, view.parent);
      projects.appendChild(elm);
    }
    for (let node of view.children) {
      if (node.type == "folder") {
        const elm = document.importNode(templateFolder, true);
        showFolder(elm, node, view);
        projects.appendChild(elm);
      } else {
        const elm = document.importNode(templateProject, true);
        showFile(elm, node);
        projects.appendChild(elm);
      }
    }
  } else {
    navigate("#preview");
  }
}

export function back() {
  metadata.current_view = metadata.current_view.parent;
  navigate("#projects");
}
