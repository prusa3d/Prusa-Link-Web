// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import formatData from "./dataFormat.js";
import joinPaths from "../../helpers/join_paths";
import upload from "./upload";
import { getJson, getImage } from "../../auth.js";
import { getValue } from "./updateProperties.js";
import { handleError } from "./errors";
import { navigateShallow } from "../../router.js";
import { translate, translateLabels } from "../../locale_provider.js";
import { createFolder, deleteFolder, deleteFile, downloadFile, renameFolder, renameFile, startPrint } from "./fileActions.js";
import printer from "../index";
import scrollIntoViewIfNeeded from "../../helpers/scroll_into_view_if_needed.js";
import * as job from "./job";
import { initKebabMenu } from "./kebabMenu.js";
import { setEnabled } from "../../helpers/element.js";
import storage from "./storage.js";
import { LinkState } from "../../state.js";
import { setButtonLoading, unsetButtonLoading } from "../../helpers/button.js";

const SORT_FIELDS = ["name", "date", "size"];
let lastData = null;
let intersectionObserver = null;
let previewLazyQueue = [];

/**
 * file context
 */
const metadata = {
  origin: "",
  current_path: [],
  files: [],
  eTag: null,
  free: 0,
  total: 0,
  firstTime: true,
  sort: {
    field: "date",
    order: "desc",
  }
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
  let usb_files = data.files.filter((elm) => elm.origin === "usb");
  if (usb_files.length > 0) {
    files.push({
      name: "usb",
      display: "USB",
      origin: "usb",
      path: "/usb",
      type: "folder",
      children: usb_files,
    });
  }
  return files;
}

const sortFiles = (files) => {
  const compareFiles = (f1, f2) => {
    if (f1.type === "folder" && f2.type !== "folder") return -1;
    if (f1.type !== "folder" && f2.type === "folder") return 1;

    const order = metadata.sort.order === "desc" ? -1 : 1;

    switch(metadata.sort.field) {
      case "date":
        const ts1 = f1.date || 0;
        const ts2 = f2.date || 0;
        return order * (ts1 - ts2);
      case "size":
        const s1 = f1.size || 0;
        const s2 = f2.size || 0;
        return order * (s1 - s2);
      case "name":
      default:
        return order * f1.display.localeCompare(f2.display);
    }
  };
  files.sort(compareFiles);
  return files;
}

/**
 * callback for update the file context
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
        if (window.location.hash === "#files") {
          navigateShallow("#files");
        }
      }
    })
    .catch((result) => handleError(result));
};

/**
 * update file page
 * @param {object} context
 */
export const update = (context) => {
  const linkState = LinkState.fromApi(context.printer.state);
  updateData();
  job.update(context, true);
  upload.update(linkState);
};

function initUpload(context) {
  const origin = metadata.origin;
  const path = joinPaths(getCurrentPath());
  upload.init(origin, path, context?.fileExtensions);
  upload.hide(metadata.origin === "sdcard");
}

/**
 * load files page
 */
export function load(context) {
  translate("proj.link", { query: "#title-status-label" });

  if (!intersectionObserver) {
    const config = {
      rootMargin: '0px 0px 50px 0px',
      threshold: 0
    };

    intersectionObserver = new IntersectionObserver((entries, self) => {
      entries.forEach(entry => {
        if(entry.isIntersecting) {
          if (process.env.WITH_PREVIEW_LAZY_QUEUE) {
            const loadPreviewQueued = () => {
              if (previewLazyQueue.length) {
                const target = previewLazyQueue[0];
                getImage(target.getAttribute('data-src')).then((url) => {
                  target.src = url;
                }).finally(() => {
                  self.unobserve(target);
                  previewLazyQueue.shift();
                  loadPreviewQueued();
                });
              }
            };
            previewLazyQueue.push(entry.target);
            if (previewLazyQueue.length === 1) {
              loadPreviewQueued();
            }
          } else {
            getImage(entry.target.getAttribute('data-src')).then((url) => {
              entry.target.src = url;
            });
          }
        }
      });
    }, config);
  }

  if (!context)
    context = printer.getContext();

  if (metadata.firstTime) {
    update(context);
    return;
  }

  const previewFile = job.getPreviewFile();
  if (previewFile) {
    const file = findFile(previewFile.origin, previewFile.path);
    if (!file) {
      job.selectFilePreview(null);
    } else if (file.date > previewFile.data) {
      job.selectFilePreview(file);
    }
  }
  job.update(context, true);

  const files = document.getElementById("files");
  while (files.firstChild) {
    files.removeChild(files.firstChild);
  }

  if (!metadata.firstTime && !metadata.origin) {
    const origin = process.env.WITH_STORAGES[0] || "local";
    metadata.origin = origin;
    selectStorage(origin);
    return;
  }

  if (context) {
    initUpload(context);
    const origins = process.env.WITH_STORAGES;
    storage.load(context, origins, metadata.origin, selectStorage);
  }

  if (metadata.current_path.length > 0) {
    let view = metadata.files.find((elm) => elm.origin === metadata.origin).children;
    for (let i = 1; i < metadata.current_path.length; i++) {
      let path = metadata.current_path[i];
      view = view.find((elm) => elm.name === path).children;
    }

    files.appendChild(createCurrent());
    if (metadata.current_path.length > 1)
      files.appendChild(createUp());

    for (let node of sortFiles(view)) {
      if (node.type === "folder") {
        // TODO: Cache file/folder count or count async.
        const filesCount = countFilesRecursively(node);
        const folders = countFoldersRecursively(node);
        files.appendChild(createNodeFolder(node.display || node.name, node.path, { files: filesCount, folders }));
      } else {
        files.appendChild(createFile(node));
      }
    }
  } else {
    console.log("This storage is not available");
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
  const current_path = [...metadata.current_path];
  const current_folder = current_path.pop() || "Root";
  const component = createElement("node-current", current_folder);
  component.getElementById("path").innerHTML = `${joinPaths(current_path)}/`

  const createBtn = component.getElementById("create");
  if (createBtn) {
    createBtn.onclick = (e) => {
      e.stopPropagation();
      createFolder();
    }
  }

  component.querySelector("#sort-by-name p").innerText = translate("sort.by-name");
  component.querySelector("#sort-by-date p").innerText = translate("sort.by-date");
  component.querySelector("#sort-by-size p").innerText = translate("sort.by-size");

  component.querySelector(`#sort-by-${metadata.sort.field}`).classList.add(metadata.sort.order);

  SORT_FIELDS.forEach(field => {
    component.getElementById(`sort-by-${field}`).addEventListener("click", (e) => {
      const newToggle = document.getElementById(`sort-by-${field}`);
      const oldToggle = document.getElementById(`sort-by-${metadata.sort.field}`);

      oldToggle.classList.remove(metadata.sort.order);

      const order = (metadata.sort.field === field)
        ? (metadata.sort.order === "asc" ? "desc" : "asc")
        : "asc";

      newToggle.classList.add(order);

      metadata.sort.field = field;
      metadata.sort.order = order;

      load();
    }, false);
  });

  return component;
}

/**
 * create a up button element
 */
function createUp() {
  const elm = createElement("node-up", "", () => {
    metadata.current_path.pop();
    load();
  });
  translateLabels(elm);
  return elm;
}

/**
 * callback when click on file element
 * @param {object} node
 */
const onClickFile = (node) => {
  showPreview(node);
};

function showPreview(file) {
  const currentPreview = job.getPreviewFile();
  if (!currentPreview
    || currentPreview.origin !== file.origin
    || currentPreview.path !== file.path
  ) {
    job.selectFilePreview(file);
    job.update(printer.getContext(), true);
  }

  const jobElement = document.getElementById("job");
  if (jobElement) {
    scrollIntoViewIfNeeded(jobElement);
  }
}

/**
 * Create a file element
 * @param {object} node
 */
function createFile(node) {
  const elm = createElement("node-file", node.display || node.name, (e) =>
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
    img.setAttribute(
      "data-src", node.date ? `${node.refs.thumbnailBig}?ct=${node.date}` : node.refs.thumbnailBig
    );
    intersectionObserver.observe(img);
  }

  initKebabMenu(elm);
  setupFileButtons(node, elm);
  translateLabels(elm);
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
      renameFile();
    }
  }

  const deleteBtn = elm.getElementById("delete");
  if (deleteBtn) {
    setEnabled(deleteBtn, !node.ro && node.refs?.resource);
    deleteBtn.onclick = (e) => {
      deleteFile(node);
      e.stopPropagation();
    }
  }

  const downloadBtn = elm.getElementById("download");
  if (downloadBtn) {
    setEnabled(downloadBtn, node.refs?.download);
    downloadBtn.onclick = (e) => {
      setButtonLoading(downloadBtn);
      downloadFile(node, () => unsetButtonLoading(downloadBtn));
      e.stopPropagation();
    }
  }
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

function selectStorage(origin) {
  if (metadata.firstTime)
    return;

  const root = metadata.files.find(i => i.origin === origin);
  if (root) {
    metadata.origin = root.origin;
    metadata.current_path = [...joinPaths(root.path).split("/").filter(str => str !== "")];
  } else {
    metadata.origin = origin;
    metadata.current_path = [];
  }
  load();

  upload.hide(origin === "sdcard")
}

function findFile(origin, path) {
  if (!origin || !path)
    return null;

  let target = metadata.files.find(i => i.origin === origin);
  const pathSegments = process.env.PRINTER_TYPE === "fdm"
    ? path.split("/").filter(i => i).slice(1)
    : path.split("/").filter(i => i);

  for (const segment of pathSegments) {
    if (!target)
      break;
    target = target.children.find(i => i.name === segment);
  }

  return target?.type === "machinecode"
    ? target
    : null;
}

export default { load, update };
