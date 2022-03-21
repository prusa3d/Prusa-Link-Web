// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import formatData from "./dataFormat.js";
import joinPaths from "../../helpers/join_paths";
import upload from "../components/upload";
import { getJson, getImage } from "../../auth.js";
import { getValue } from "./updateProperties.js";
import { handleError } from "./errors";
import { navigateShallow } from "../../router.js";
import { translate, translateLabels } from "../../locale_provider.js";
import { createFolder, deleteFolder, deleteProject, downloadProject, renameFolder, renameProject, startPrint } from "./projectActions.js";
import printer from "../index";
import { error } from "./toast.js";
import { cancelPreview } from "./jobActions";
import scrollIntoViewIfNeeded from "../../helpers/scroll_into_view_if_needed.js";
import * as job from "./job";
import { initKebabMenu } from "./kebabMenu.js";
import { onOutsideClick, setEnabled } from "../../helpers/element.js";
import { updateProgressBar } from "./progressBar.js";

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
  }

  let files = [{
    name: "local",
    display: "Local",
    origin: "local",
    path: "/local",
    type: "folder",
    children: data.files.filter((elm) => elm.origin === "local"),
  }];
  let usb_files = data.files.filter((elm) => elm.origin === "sdcard");
  if (usb_files.length > 0) {
    files.push({
      name: "sdcard",
      display: "USB",
      origin: "sdcard",
      path: "/sdcard",
      type: "folder",
      children: usb_files,
    });
  }
  return files;
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
          navigateShallow("#projects");
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
    navigateShallow("#loading");
  }
  updateData();
  job.update(context);
  upload.update();
};

function initUpload(context) {
  const origin = metadata.origin;
  const path = joinPaths(getCurrentPath());
  upload.init(origin, path, context?.projectExtensions);
}

/**
 * load projects page
 */
export function load(context) {
  if (!context)
    context = printer.getContext();

  if (context)
    job.update(context);

  const projects = document.getElementById("projects");
  while (projects.firstChild) {
    projects.removeChild(projects.firstChild);
  }

  if (metadata.current_path.length === 0)
    metadata.origin = "local";

  projects.appendChild(createStorages());
  if (context)
    initUpload(context);

  if (metadata.current_path.length > 0) {
    let view = metadata.files.find((elm) => elm.origin === metadata.origin).children;
    for (let i = 1; i < metadata.current_path.length; i++) {
      let path = metadata.current_path[i];
      view = view.find((elm) => elm.name === path).children;
    }

    document.getElementById(
      "title-status-label"
    ).innerHTML = metadata.current_path.join(" > ");

    projects.appendChild(createCurrent());
    projects.appendChild(createUp());
    for (let node of view) {
      if (node.type === "folder") {
        // TODO: Cache file/folder count or count async.
        const files = countFilesRecursively(node);
        const folders = countFoldersRecursively(node);
        projects.appendChild(createNodeFolder(node.display || node.name, node.path, { files, folders }));
      } else {
        projects.appendChild(createFile(node));
      }
    }
  } else {
    document.getElementById("title-status-label").innerHTML = translate("proj.title");
    if (metadata.files.length) {
      for (let file of metadata.files) {
        if (file.type === "folder") {
          const files = countFilesRecursively(file);
          const folders = countFoldersRecursively(file);
          projects.appendChild(createNodeFolder(file.display || file.name, joinPaths(file.path), { files, folders }, file.origin));
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
  if (cb) {
    elm.querySelector(".node").addEventListener("click", (e) => {
      cb(e);
      e.preventDefault();
    });
  }
  elm.querySelector("#name")?.appendChild(document.createTextNode(name));
  return elm;
}

/**
 * Create a folder element
 * @param {string} name
 * @param {string} path
 * @param {{files: number, folders: number} | undefined} details (optional)
 * @param {string|undefined} origin (optimal)
 */
function createNodeFolder(name, path, details, origin) {
  const elm = createElement("node-folder", name, () => {
    if (origin)
      metadata.origin = origin;

    if (!origin && process.env.PRINTER_TYPE === "sla") {
      metadata.current_path = [metadata.origin, ...path.split("/").filter(str => str !== "")];
    } else {
      metadata.current_path = path.split("/").filter(str => str !== "");
    }
    load();
  });

  const filesText = details?.files ? `${details.files} files` : null;
  const foldersText = details?.folders ? `${details.folders} folders` : null;
  const detailsText = [filesText, foldersText].filter(i => i != null).join(" | ");

  elm.getElementById("details").innerHTML = detailsText;

  const deleteBtn = elm.getElementById("delete");
  if (deleteBtn) {
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteFolder();
    }
  }
  const renameBtn = elm.getElementById("rename");
  if (renameBtn) {
    renameBtn.onclick = (e) => {
      e.stopPropagation();
      renameFolder();
    }
  }
  return elm;
}

function createCurrent() {
  const p = metadata.current_path;
  const title = p.length > 0 ? p[p.length - 1] : "Root";
  const elm = createElement("node-current", title);
  elm.getElementById("path").innerHTML = `/${joinPaths(metadata.current_path.slice(0, -1))}`

  const createBtn = elm.getElementById("create");
  if (createBtn) {
    createBtn.onclick = (e) => {
      e.stopPropagation();
      createFolder();
    }
  }
  return elm;
}

function createStorages() {
  const elm = createElement("node-storages", "");
  const dropdownBtn = elm.querySelector(".storage-select-btn");
  const dropdownContent = elm.querySelector(".storage-select-content");
  dropdownBtn.onclick = (e) => {
    e.stopPropagation();
    dropdownContent.classList.toggle("open");
    onOutsideClick(() => {
      dropdownContent?.classList.remove("open");
    }, dropdownBtn, dropdownContent);
  }
  dropdownContent.querySelectorAll("li").forEach(li => {
    const origin = li.id;
    const path = li.getAttribute("data-path");
    li.setAttribute("selected", metadata.origin === origin); // for pc
    li.onclick = (e) => {
      e.stopPropagation();
      if (!metadata.firstTime) {
        dropdownBtn.innerHTML = li.innerHTML;
        dropdownContent.classList.remove("open");
        metadata.origin = origin;
        metadata.current_path = [path]; // TODO: Don't use path in templates
        load();
      }
    }
  })
  const selected = dropdownContent.querySelector("li[selected=true]");
  if (selected) {
    dropdownBtn.querySelector(".storage-select-btn-inner").innerHTML = selected.innerHTML;
  }

  updateProgressBar(elm, 0.5);
  return elm;
}

/**
 * create a up button element
 */
function createUp() {
  const p = metadata.current_path;
  const title = p[p.length - 1];
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
      element.querySelector("p[data-value]").innerHTML = data;
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

  initKebabMenu(elm);
  setupFileButtons(node, elm);
  return elm;
}

function setupFileButtons(node, elm) {
  // Setup buttons
  const paths = getNodeFilePaths(node.name);
  const fileUrl = joinPaths("/api/files/", ...paths);

  const detailsBtn = elm.getElementById("details");
  if (detailsBtn) {
    detailsBtn.onclick = (e) => {
      onClickFile(node);
    }
  }
  const startBtn = elm.getElementById("start");
  if (startBtn) {
    startBtn.onclick = (e) => {
      e.stopPropagation();
      startPrint();
    }
  }
  const renameBtn = elm.getElementById("rename");
  if (renameBtn) {
    renameBtn.onclick = (e) => {
      e.stopPropagation();
      renameProject();
    }
  }

  const deleteBtn = elm.getElementById("delete");
  const downloadBtn = elm.getElementById("download");
  getJson(fileUrl).then((result) => {
    const file = result.data;
    if (deleteBtn) {
      setEnabled(deleteBtn, file.refs?.resource);
      deleteBtn.onclick = (e) => {
        deleteProject(file);
        e.stopPropagation();
      }
    }
    if (downloadBtn) {
      setEnabled(downloadBtn, file.refs?.download);
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

function countFoldersRecursively(node) {
  const folders = node?.children?.filter(i => i.type === "folder") || [];
  let count = folders.length || 0;
  folders.forEach(i => count += countFoldersRecursively(i));
  return count;
}

function countFilesRecursively(node) {
  const files = node?.children?.filter(i => i.type === "machinecode") || [];
  const folders = node?.children?.filter(i => i.type === "folder") || [];
  let count = files.length || 0;
  folders.forEach(i => count += countFilesRecursively(i));
  return count;
}

export default { load, update };
