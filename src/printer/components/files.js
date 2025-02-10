// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import formatData from "./dataFormat.js";
import upload from "./upload";
import { getJson, getImage } from "../../auth.js";
import { getValue } from "./updateProperties.js";
import { translate, translateLabels } from "../../locale_provider.js";
import {
  createFolder,
  deleteFolder,
  deleteFile,
  downloadFile,
  renameFolder,
  renameFile,
  startPrint,
} from "./fileActions.js";
import printer from "../index";
import scrollIntoViewIfNeeded from "../../helpers/scroll_into_view_if_needed.js";
import * as job from "./job";
import { initKebabMenu } from "./kebabMenu.js";
import { setDisabled, setEnabled, setVisible } from "../../helpers/element.js";
import storage from "./storage.js";
import { setButtonLoading, unsetButtonLoading } from "../../helpers/button.js";

const FILE_TYPE = {
  "FOLDER": "FOLDER",
  "PRINT_FILE": "PRINT_FILE",
  "FIRMWARE": "FIRMWARE",
  "FILE": "FILE"
};

const SORT_FIELDS = ["name", "date", "size"];

let intersectionObserver = null;
let previewLazyQueue = [];


/**
 * file context
 */
const metadata = {
  origin: null,
  current_path: [],
  storages: {},
  files: [],
  eTag: null,
  sort: {
    field: process.env["WITH_NAME_SORTING_DEFAULT"] ? "name" : "date",
    order: process.env["WITH_NAME_SORTING_DEFAULT"] ? "asc" : "desc",
  },
};

function getCurrentStorage() {
  const origin = metadata.origin;
  return metadata.storages[origin];
}

function getCurrentPath() {
  return metadata.current_path.map((segment) => segment.path).join("/");
}

function getCurrentApiPath(fileName) {
  const storage = getCurrentStorage();
  const path = getCurrentPath();
  return getApiPath(storage.path, path, fileName);
}

export function getApiPath(origin, path, file) {
  const apiPath = ["/api/v1/files", origin, path, file].filter((e) => !!e)
    .join("/");

  return file ? apiPath : `${apiPath}/`;
}


const sortFiles = (files) => {
  const compareFiles = (f1, f2) => {
    if (f1.type === FILE_TYPE.FOLDER && f2.type !== FILE_TYPE.FOLDER) return -1;
    if (f1.type !== FILE_TYPE.FOLDER && f2.type === FILE_TYPE.FOLDER) return 1;

    const order = metadata.sort.order === "desc" ? -1 : 1;

    switch (metadata.sort.field) {
      case "date":
        const ts1 = f1.m_timestamp || 0;
        const ts2 = f2.m_timestamp || 0;
        return order * (ts1 - ts2);
      case "size":
        const s1 = f1.size || 0;
        const s2 = f2.size || 0;
        return order * (s1 - s2);
      case "name":
      default:
        return order * f1.display_name.localeCompare(f2.display_name);
    }
  };
  files.sort(compareFiles);
  return files;
};

const updateStorage = (opts = {}) => {
  getJson("/api/v1/storage", {
    // headers: { "If-None-Match": metadata.eTag },
  }).then((result) => {
    const list = result.data?.storage_list;
    let redrawTabs = !!opts.redraw;
    let redrawStorageDetails = !!opts.redraw;
    if (list) {
      list.forEach((entry) => {
        const storageType = entry.type;
        const storageData = {
          name: entry.name,
          path: entry.path.replaceAll('/', ''),
          available: entry.available,
          readOnly: entry.read_only,
          freeSpace: entry.free_space,
          totalSpace: entry.total_space,
          // NOTE: unused on FE
          // systemFiles: entry.system_files,
          // printFiles: entry.print_files,
        };

        if (storageType in metadata.storages) {
          const storage = metadata.storages[storageType];

          if (storage.available !== storageData.available) {
            redrawTabs = true;
            // check if selected storage became inavailable (i.e. USB was disconnected)
            // if (metadata.origin === storageType && !storageData.available) {
            //   metadata.origin = false;
            // }
          }

          if (
            storage.freeSpace !== storageData.freeSpace &&
            metadata.origin === storageType
          ) {
            redrawStorageDetails = true;
          }
        } else {
          redrawTabs = true;
          redrawStorageDetails = true;
        }

        metadata.storages[storageType] = storageData;
      });
    }

    if (!metadata.origin) {
      // try first available storage to set as active
      let storage = Object.keys(metadata.storages).find(
        (storage) => metadata.storages[storage].available
      );

      // try the first storage
      if (!storage) {
        storage = Object.keys(metadata.storages).find(() => true);
      }

      if (storage) {
        selectStorage(storage);
      }
    }

    if (redrawTabs) {
      storage.update(
        metadata.storages,
        metadata.origin,
        selectStorage,
        redrawStorageDetails
      );
    }
  });
};

const updateFiles = (opts = {}) => {
  const selectedStorage = getCurrentStorage();
  if (!selectedStorage) return;

  const url = getCurrentApiPath();

  let lastETag = metadata.eTag;

  if (opts.force) {
    metadata.eTag = null;
    lastETag = null;
    initUpload(printer.getContext());
  }

  const setFilesList = (files) => {
    metadata.files = files;
    // in case if files on the printer have changed, clearing on response makes more sense
    clearFiles();
    redrawFiles();
  };

  getJson(url, {
    headers: { "If-None-Match": lastETag },
  })
  .then((result) => {
    if (result.code === 304) {
      return
    }
    if (url !== getCurrentApiPath()) {
      // user navigated to other folder
      return;
    }
    const eTag = result.eTag;
    if (!eTag || eTag !== lastETag) {
      metadata.eTag = eTag;
      // NOTE: Brute force control for printers that temporary do not support eTag.
      // TODO: remove when supported by all printers
      const files = result.data.children || [];
      if (!eTag && !opts.force) {
        const sortFunc = (f1, f2) => f1.display_name.localeCompare(f2.display_name);
        const oldFiles = JSON.stringify([...metadata.files].sort(sortFunc));
        const newFiles = JSON.stringify(files.sort(sortFunc));
        if (oldFiles === newFiles) {
          return;
        }
      }
      setFilesList(files)
    }
  })
  .catch(() => {
    metadata.eTag = null;
    setFilesList([]);
    printer.getContext().selectFile(null);
  });
};

const clearFiles = () => {
  const files = document.getElementById("files");
  if (files) {
    while (files?.firstChild) {
      files.removeChild(files.firstChild);
    }
    files.appendChild(createCurrent());
    if (metadata.current_path.length) {
      files.appendChild(createUp());
    }
  }
};

const redrawFiles = () => {
  const filesNode = document.getElementById("files");
  let node = undefined;
  if (filesNode) {
    for (let entry of sortFiles(metadata.files)) {
      switch (entry.type.toUpperCase()) {
        case FILE_TYPE.FOLDER:
          node = createNodeFolder(entry, {
            // NOTE: currently unsupported because of BE limitations
            files: undefined,
            folders: undefined,
          });
          break;

        case FILE_TYPE.PRINT_FILE:
          node = createPrintFile(entry);
          break

        case FILE_TYPE.FIRMWARE:
          node = createFile(entry, "firmware");
          break;

        case FILE_TYPE.FILE:
        default:
          node = createFile(entry, "file");
          break;
      }
      filesNode.appendChild(node);
    }
  }
};

/**
 * update file page
 * @param {object} context
 */
export const update = (context) => {
  const linkState = context.state;
  updateStorage();
  updateFiles();
  job.update(context, true);
  upload.update(linkState);
};

function initUpload(context) {
  const storage = getCurrentStorage();
  const path = getCurrentPath();
  upload.init(storage.path, path, context?.fileExtensions);
  upload.hide(storage?.readOnly !== false);
}

/**
 * load files page
 */
export function load(context) {
  metadata.eTag = null;

  translate("proj.link", { query: "#title-status-label" });

  if (!intersectionObserver) {
    const config = {
      rootMargin: "0px 0px 50px 0px",
      threshold: 0,
    };

    intersectionObserver = new IntersectionObserver((entries, self) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (process.env.WITH_PREVIEW_LAZY_QUEUE) {
            const loadPreviewQueued = () => {
              if (previewLazyQueue.length) {
                const target = previewLazyQueue[0];
                getImage(target.getAttribute("data-src"))
                  .then(({ url }) => {
                    target.src = url;
                  })
                  .finally(() => {
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
            const dataSrc = entry.target.getAttribute("data-src");
            getImage(dataSrc).then(({ url }) => {
              entry.target.src = url;
            }).catch(() => {}); // NOTE: ignore missing thumbnails
          }
        }
      });
    }, config);
  }

  if (!context) {
    context = printer.getContext();
  }

  const previewFile = context.files.selected;
  if (previewFile) {
    const file = findFile(previewFile.origin, previewFile.path);
    if (!file) {
      context.selectFile(null);
    }
  }
  job.update(context, true);

  storage.load();

  updateStorage({ redraw: true });
  updateFiles({ force: true });
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
function createNodeFolder(entry, details) {
  const name = entry.display_name || entry.name;
  const path = entry.name;
  const resource = getCurrentApiPath(path);
  const elm = createElement("node-folder", name, () => {
    metadata.current_path.push({
      path: path.replace("/", ""),
      name,
    });
    clearFiles();
    updateFiles({ force: true });
  });

  const filesText = details?.files ? `${details.files} files` : null;
  const foldersText = details?.folders ? `${details.folders} folders` : null;
  const detailsText = [filesText, foldersText]
    .filter((i) => i != null)
    .join(" | ");

  elm.getElementById("details").innerHTML = detailsText;

  const deleteBtn = elm.getElementById("delete");
  setEnabled(deleteBtn, !(entry.read_only || entry.ro))
  if (deleteBtn) {
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteFolder(resource, name, () => {});
    };
  }
  const renameBtn = elm.getElementById("rename");
  if (renameBtn) {
    renameBtn.onclick = (e) => {
      e.stopPropagation();
      renameFolder();
    };
  }
  return elm;
}

function createCurrent() {
  const storage = getCurrentStorage();
  const currentPath = [
    storage.name, ...metadata.current_path.map((segment) => segment.name)
  ];
  const currentFolder = currentPath.pop() || "Root";
  const component = createElement("node-current", currentFolder);
  component.getElementById("path").innerHTML = `${currentPath.join("/")}/`;

  const createBtn = component.getElementById("create");
  if (createBtn) {
    createBtn.onclick = (e) => {
      e.stopPropagation();
      createFolder(getCurrentApiPath);
    };
  }

  setDisabled(createBtn, storage.readOnly !== false);

  component.querySelector("#sort-by-name p").innerText = translate(
    "sort.by-name"
  );
  component.querySelector("#sort-by-date p").innerText = translate(
    "sort.by-date"
  );
  component.querySelector("#sort-by-size p").innerText = translate(
    "sort.by-size"
  );

  component
    .querySelector(`#sort-by-${metadata.sort.field}`)
    .classList.add(metadata.sort.order);

  SORT_FIELDS.forEach((field) => {
    component.getElementById(`sort-by-${field}`).addEventListener(
      "click",
      (e) => {
        const newToggle = document.getElementById(`sort-by-${field}`);
        const oldToggle = document.getElementById(
          `sort-by-${metadata.sort.field}`
        );

        oldToggle.classList.remove(metadata.sort.order);

        const order =
          metadata.sort.field === field
            ? metadata.sort.order === "asc"
              ? "desc"
              : "asc"
            : "asc";

        newToggle.classList.add(order);

        metadata.sort.field = field;
        metadata.sort.order = order;

        clearFiles();
        redrawFiles();
      },
      false
    );
  });

  return component;
}

/**
 * create a up button element
 */
function createUp() {
  const elm = createElement("node-up", "", () => {
    metadata.current_path.pop();
    clearFiles();
    updateFiles({ force: true });
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
  const context = printer.getContext();
  const currentPreview = context.files.selected;
  const path = getCurrentPath();
  const resource = getCurrentApiPath(file.name);

  if (currentPreview === path) {
    return;
  }

  context.selectFile({
    ...file,
    path,
    resource
  });

  //getJson(path)
  //  .then(result => {
  //    job.selectFilePreview(result.data, path)
  //    job.update(printer.getContext(), true)
  // });

  const jobElement = document.getElementById("job");
  if (jobElement) {
    scrollIntoViewIfNeeded(jobElement);
  }
}

/**
 * Create a file element
 * @param {object} node
 */
function createPrintFile(node) {
  const elm = createElement("node-file", node.display_name || node.name, (e) =>
    onClickFile(node)
  );
  const nodeDetails = elm.querySelector(".node-details");
  nodeDetails.querySelectorAll(".details").forEach((element) => {
    translateLabels(element);
    const value = getValue(element.dataset.where, node);
    if (value) {
      const data = formatData(element.dataset.format, value);
      element.querySelector("p[data-value]").innerHTML = data;
    } else {
      nodeDetails.removeChild(element);
    }
  });
  const thumbnail = node?.refs?.thumbnail;
  if (thumbnail) {
    const img = elm.querySelector("img.node-img");
    img.setAttribute(
      "data-src",
      node.date ? `${thumbnail}?ct=${node.date}` : thumbnail
    );
    intersectionObserver.observe(img);
  }

  initKebabMenu(elm);
  setupFileButtons(node, elm);
  translateLabels(elm);
  return elm;
}

function createFile(node, icon) {
  const elm = createElement("node-file", node.display_name || node.name, (e) => {});
  const nodeDetails = elm.querySelector(".node-details");
  nodeDetails.querySelectorAll(".details").forEach((element) => {
    translateLabels(element);
    const value = getValue(element.dataset.where, node);
    if (value) {
      const data = formatData(element.dataset.format, value);
      element.querySelector("p[data-value]").innerHTML = data;
    } else {
      nodeDetails.removeChild(element);
    }
  });

  const img = elm.querySelector("img.node-img");
  if (icon) {
    const src = img.getAttribute(`data-${icon}`);
    if (src) {
      img.src = src;
    }
    intersectionObserver.observe(img);
  } else {
    setVisible(img, false);
  }

  hideFileButtons(elm);

  return elm;
}

function setupFileButtons(node, elm) {
  const fileUrl = getCurrentApiPath(node.name);
  const fileDisplayName = node.display_name || node.name;

  const detailsBtn = elm.getElementById("details");
  if (detailsBtn) {
    detailsBtn.onclick = (e) => {
      onClickFile(node);
    };
  }
  const startBtn = elm.getElementById("start");
  if (startBtn) {
    startBtn.onclick = (e) => {
      e.stopPropagation();
      startPrint();
    };
  }
  const renameBtn = elm.getElementById("rename");
  if (renameBtn) {
    renameBtn.onclick = (e) => {
      e.stopPropagation();
      renameFile();
    };
  }

  const deleteBtn = elm.getElementById("delete");
  if (deleteBtn) {
    setEnabled(deleteBtn, !(node.read_only || node.ro));
    deleteBtn.onclick = (e) => {
      deleteFile(fileUrl, fileDisplayName);
      e.stopPropagation();
    };
  }

  const downloadBtn = elm.getElementById("download");
  if (downloadBtn) {
    setEnabled(downloadBtn, !!node.refs?.download);
    downloadBtn.onclick = (e) => {
      setButtonLoading(downloadBtn);
      downloadFile(node.refs?.download, fileDisplayName, () =>
        unsetButtonLoading(downloadBtn)
      );
      e.stopPropagation();
    };
  }
}

function hideFileButtons(elm) {
  [
    "details",
    "start",
    "rename",
    "delete",
    "download"
  ].forEach(id => {
    const button = elm.getElementById(id);
    if (button) {
      setVisible(button, false);
    }
  });
}

function selectStorage(origin) {
  if (origin in metadata.storages) {
    const storage = metadata.storages[origin];

    metadata.origin = origin;
    metadata.current_path = [];
    clearFiles();

    if (storage.available) {
      updateFiles({ force: true });
    }
    upload.hide(storage.readOnly !== false)
  }
}

function findFile(origin, path) {
  if (!origin || !path) return null;

  let target = metadata.files.find((i) => i.origin === origin);
  const pathSegments =
    process.env.PRINTER_TYPE === "fdm"
      ? path
          .split("/")
          .filter((i) => i)
          .slice(1)
      : path.split("/").filter((i) => i);

  for (const segment of pathSegments) {
    if (!target) break;
    target = target.children.find((i) => i.name === segment);
  }

  return target?.type === "machinecode" ? target : null;
}

export default { load, update, getApiPath };
