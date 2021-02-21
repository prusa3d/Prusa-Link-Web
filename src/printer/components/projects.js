// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth.js";
import { navigate } from "../../router.js";
import { errorFormat, handleError } from "./errors";
import { getValue } from "./updateProperties.js";
import formatData from "./dataFormat.js";

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
      if (window.location.hash == "#projects") {
        load();
      }
    } else {
      errorFormat(data);
    }
  }
};

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
  }
};

export function load() {
  const projects = document.getElementById("projects");
  while (projects.firstChild) {
    projects.removeChild(projects.firstChild);
  }

  if (metadata.pending || !metadata.eTag) {
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
    load();
  });
}

function createUp() {
  return createElement("node-up", "Main", () => {
    metadata.current_path.pop();
    load();
  });
}

const onClickFile = (node) => {
  if (!metadata.pending) {
    metadata.pending = true;
    load();
    getJson(node.refs.resource, handleError, {
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
