// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth.js";

const metadata = {
  current_path: [],
  files: {},
  eTag: null,
  free: 0,
  total: 0,
  pending: false,
};

const sortByType = (a, b) => {
  if (a.type == b.type) {
    return a.display.localeCompare(b.display);
  } else if (a.type == "folder") {
    return -1;
  }
  return 1;
};

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
    } else {
      console.error(`Cant get printer API! Error ${status.code}`);
      console.error(data);
    }
  }
};

export function update() {
  return getJson("/api/files?recursive=true", updateData, {
    headers: { "If-None-Match": metadata.eTag },
  }).then(() => {
    if (window.location.hash == "#projects") {
      show();
    }
  });
}

export function show() {
  const projects = document.getElementById("projects");
  while (projects.firstChild) {
    projects.removeChild(projects.firstChild);
  }

  if (metadata.pending) {
    const templatePending = document.getElementById("pending").content;
    const elm = document.importNode(templatePending, true);
    projects.appendChild(elm);
    return;
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

function createFolder(name) {
  return createElement("node-folder", name, () => {
    metadata.current_path.push(name);
    show();
  });
}

function createUp() {
  return createElement("node-up", "Main", () => {
    metadata.current_path.pop();
    show();
  });
}

const selectError = (status, data) => {
  if (!status.ok) {
    console.error(`Cant get printer API! Error ${status.code}`);
    console.error(data);
  }
};

const onClickFile = (node) => {
  if (!metadata.pending) {
    metadata.pending = true;
    show();
    getJson(node.refs.resource, selectError, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command: "select" }),
    }).finally(() => {
      metadata.pending = false;
    });
  }
};

function createFile(node) {
  const elm = createElement("node-project", node.display, (e) =>
    onClickFile(node)
  );
  const nodeDetails = elm.querySelector(".node-details");
  const properties = node["gcodeAnalysis"];
  for (let property of ["estimatedPrintTime", "material", "layerHeight"]) {
    let element = elm.getElementById(property);
    if (properties[property]) {
      let span = document.createElement("span");
      span.innerHTML = properties[property];
      element.querySelector("p").appendChild(span);
    } else {
      nodeDetails.removeChild(element);
    }
  }
  return elm;
}
