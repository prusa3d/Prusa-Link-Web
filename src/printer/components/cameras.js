// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later
import { API_ROOT, getImage, getJson } from "../../auth";
import { setDisabled, setHidden, setVisible } from "../../helpers/element";
import { translate } from "../../locale_provider";
import { success } from "./toast";
import { modal } from "./modal";
import { Dropdown } from "./dropdown";
import { handleError } from "./errors";

let allowCloud = false;
let currentCameraId = undefined;
let cameras = [];

const triggerScheme = {
  TEN_SEC: "TEN_SEC",
  THIRTY_SEC: "THIRTY_SEC",
  SIXTY_SEC: "SIXTY_SEC",
  EACH_LAYER: "EACH_LAYER",
  FIFTH_LAYER: "FIFTH_LAYER",
  MANUAL: "MANUAL",
};

const translateTriggerScheme = (scheme) => {
  switch (scheme) {
    case triggerScheme.TEN_SEC:
      return translate("cameras.trigger-scheme.ten-sec");
    case triggerScheme.THIRTY_SEC:
      return translate("cameras.trigger-scheme.thirty-sec");
    case triggerScheme.SIXTY_SEC:
      return translate("cameras.trigger-scheme.sixty-sec");
    case triggerScheme.EACH_LAYER:
      return translate("cameras.trigger-scheme.each-layer");
    case triggerScheme.FIFTH_LAYER:
      return translate("cameras.trigger-scheme.fifth-layer");
    case triggerScheme.MANUAL:
      return translate("cameras.trigger-scheme.manual");
    default:
      return `${scheme}`;
  }
};

const displaySuccess = () =>
  success(translate("ntf.success"), translate("ntf.camera-suc"));

const load = (context) => {
  cameras = [];
  translate("cameras.link", { query: "#title-status-label" });
  update(context);
};

const update = (context, updateUI = updateCamerasUI) => {
  if (currentCameraId === undefined) {
    currentCameraId = context.camera.id;
  }
  allowCloud = context.link.connect.ok;
  getJson("/api/v1/cameras")
    .then((result) => {
      const list = (result?.data?.camera_list || []).map((item) => {
        let camera = cameras.find((c) => c.id === item.camera_id) || {};

        if (item.camera_id === currentCameraId) {
          if (!item.connected) {
            currentCameraId = null;
          }
        }

        return {
          id: item.camera_id,
          config: item.config,
          connected: item.connected,
          detected: item.detected,
          stored: item.stored,
          registered: item.registered,
          nextSnapshotAt: camera?.nextSnapshotAt,
          lastSnapshotAt: camera?.lastSnapshotAt,
          lastSnapshotUrl: camera?.lastSnapshotUrl,
        };
      });

      const removed = cameras.filter(
        (cam1) => !list.find((cam2) => cam1.id === cam2.id)
      );

      updateUI && updateUI(list, removed);

      cameras = list;
    })
    .catch(handleError);

  cameras
    .filter((camera) => camera.connected)
    .forEach((camera) => updateSnapshot(camera.id));
};

const getCameraNodeId = (cameraId) => `camera_${cameraId}`;

const getCameraNode = (cameraId) =>
  document.getElementById(getCameraNodeId(cameraId));

const updateSnapshot = (cameraId) => {
  const camera = cameras.find((c) => c.id === cameraId);
  if (!camera) return;

  const now = new Date();
  if (camera.lastSnapshotAt && camera.nextSnapshotAt) {
    if (now < camera.nextSnapshotAt) {
      return;
    }
  }

  getImage(`/api/v1/cameras/${cameraId}/snap`, 0, {
    headers: camera.lastSnapshotAt
      ? {
          "If-Modified-Since": camera.lastSnapshotAt.toUTCString(),
        }
      : {},
  }).then(({ url, headers }) => {
    const camera = cameras.find((c) => c.id === cameraId);
    const cameraNodeId = getCameraNodeId(cameraId);
    const noSnapshotNode = document.querySelector(
      `#${cameraNodeId} .camera__no-snapshot`
    );
    const snapshotNode = document.querySelector(
      `#${cameraNodeId} .camera__snapshot`
    );
    if (noSnapshotNode) {
      setVisible(noSnapshotNode, false);
    }
    if (snapshotNode) {
      setVisible(snapshotNode, true);
      snapshotNode.src = url;
    }
    if (camera) {
      const cacheControl = headers.get("cache-control");
      const maxAgeMatch = `${cacheControl}`.match(/max-age=(\d+)/);

      let maxAge;
      if (maxAgeMatch) {
        maxAge = parseInt(maxAgeMatch[1], 10);
      }
      if (!maxAge) {
        maxAge = 11;
      }

      const expires = headers.get("expires");
      const date = headers.get("last-modified");
      const autoExpires = (maxAgeSeconds) => {
        const now = new Date();
        return new Date(now.getTime() + maxAgeSeconds * 1000);
      };
      camera.nextSnapshotAt = expires ? new Date(expires) : autoExpires(maxAge);
      // NOTE: workaround for BE issue when `expires` is in the past
      if (camera.nextSnapshotAt < now) {
        camera.nextSnapshotAt = autoExpires(maxAge);
      }
      camera.lastSnapshotAt = date ? new Date(date) : new Date();
      camera.lastSnapshotUrl = url;
      if (!currentCameraId || camera.id === currentCameraId) {
        updateCurrentCamera(camera.id);
      }
    }
  });
};

const updateCurrentCamera = (cameraId) => {
  if (!cameraId) {
    cameraId = currentCameraId;
  }
  const camera = cameraId ? cameras.find((c) => c.id === cameraId) : null;
  const snapshotPicture = document.getElementById("camera-snapshot-picture");
  const snapshotTime = document.getElementById("camera-snapshot-time");
  const snapshotName = document.getElementById("camera-snapshot-name");
  const [id, name, time, url] = camera?.lastSnapshotAt
    ? [
        camera.id,
        camera.config.name,
        camera.lastSnapshotAt.toLocaleString(),
        camera.lastSnapshotUrl,
      ]
    : [null, "-", "-", ""];
  currentCameraId = id;

  if (snapshotPicture) {
    snapshotPicture.src = url;
  }
  if (snapshotTime) {
    snapshotTime.innerText = time;
  }
  if (snapshotName) {
    snapshotName.innerText = name;
  }
};

const updateCameraNode = (cameraNode, camera, firstTime = false) => {
  cameraNode.querySelector(".camera__name").innerText = camera.config.name;
  cameraNode.querySelector(".camera__path").innerText = camera.config.path || '-';
  cameraNode.querySelector(".camera__driver").innerText = camera.config.driver || '-';
  cameraNode.querySelector(".camera__cloud").innerText = camera.registered
    ? translate("camera.cloud.linked")
    : translate("camera.cloud.not-linked");

  const btnLink = cameraNode.querySelector(".camera__register");
  const btnUnlink = cameraNode.querySelector(".camera__unregister");
  const btnAdd = cameraNode.querySelector(".camera__add");
  const btnRemove = cameraNode.querySelector(".camera__remove");
  const btnSettings = cameraNode.querySelector(".camera__settings");

  setVisible(btnLink, allowCloud && camera.connected && !camera.registered);
  setVisible(btnUnlink, allowCloud && camera.connected && camera.registered);
  // TODO: Manual connection is not available in Link yet
  setVisible(btnAdd, false);
  setVisible(btnRemove, !camera.connected);
  setVisible(btnSettings, camera.connected);

  if (firstTime) {
    btnAdd.title = translate("camera.btn.connect");
    btnSettings.title = translate("camera.btn.settings");
    btnLink.title = translate("camera.btn.link");
    btnUnlink.title = translate("camera.btn.unlink");

    btnAdd.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
        tryConnectCamera(camera.id);
      },
      false
    );

    btnRemove.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
        removeCamera(camera.id);
      },
      false
    );

    btnSettings.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
        openCameraSettingsModal(camera.id);
      },
      false
    );

    btnLink.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
        controlCloudConnection(camera.id, "POST");
      },
      false
    );

    btnUnlink.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
        controlCloudConnection(camera.id, "DELETE");
      },
      false
    );
  }
};

const controlCloudConnection = (cameraId, method) => {
  getJson(`/api/v1/cameras/${cameraId}/connection`, {
    method,
  })
    .then(() => displaySuccess())
    .catch(handleError);
};

const tryConnectCamera = (cameraId) => {
  const camera = cameras.find((c) => c.id === cameraId);
  if (camera) {
    getJson(`/api/v1/cameras/${camera.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        config: camera.config,
      }),
    })
      .then(() => displaySuccess())
      .catch(handleError);
  }
};

const removeCamera = (cameraId) => {
  const camera = cameras.find((c) => c.id === cameraId);
  if (camera) {
    getJson(`/api/v1/cameras/${camera.id}`, {
      method: "DELETE",
    })
      .then(() => displaySuccess())
      .catch(handleError);
  }
};

const createCameraNode = (camera) => {
  const template = document.getElementById("camera-list-item")?.content;
  if (!template) {
    return null;
  }

  const node = document.importNode(template, true);
  const listItemNode = node.querySelector("li");
  const cameraId = camera.id;

  listItemNode.addEventListener(
    "click",
    (e) => {
      const camera = cameras.find((c) => c.id === cameraId);
      if (camera) {
        if (camera.connected) {
          updateCurrentCamera(camera.id);
        }
      }
      e.preventDefault();
    },
    false
  );

  listItemNode.id = getCameraNodeId(camera.id);
  node.querySelector(".camera__path__label").innerText = translate(
    "camera.path"
  );
  node.querySelector(".camera__driver__label").innerText = translate(
    "camera.driver"
  );
  node.querySelector(".camera__cloud__label").innerText = translate(
    "camera.cloud.label"
  );

  setVisible(node.querySelector(".camera__snapshot"), false);
  updateCameraNode(node, camera, true);

  return node;
};

const updateCamerasUI = (list, removed) => {
  const listNode = document.getElementById("cameras-list");

  removed.forEach((camera) => {
    const cameraNode = getCameraNode(camera.id);
    if (cameraNode) {
      listNode.removeChild(cameraNode);
    }
  });

  // update changed cameras
  list
    .sort((cam1, cam2) => cam2.connected - cam1.connected)
    .forEach((camera) => {
      const cameraNode = getCameraNode(camera.id);
      if (cameraNode) {
        updateCameraNode(cameraNode, camera);
      } else {
        const node = createCameraNode(camera);
        if (node) {
          listNode.appendChild(node);
        }
      }
    });
};

const createCameraSettingsModal = (cameraId, resolve) => {
  return (close) => {
    const apiCameraUrl = `/api/v1/cameras/${cameraId}`;
    const template = document.getElementById(`modal-camera-settings`);
    const node = document.importNode(template.content, true);

    const inputName = node.getElementById("camera-settings__name");
    const inputFocus = node.getElementById("camera-settings__focus");

    const inputResolution = Dropdown.init(
      node.getElementById("camera-settings__resolution"),
      "camera-settings__resolution"
    );
    const inputTriggerScheme = Dropdown.init(
      node.getElementById("camera-settings__trigger-scheme"),
      "camera-settings__trigger-scheme"
    );

    const btnConfirm = node.getElementById("yes");

    getJson(apiCameraUrl)
      .then((res) => {
        const data = res.data;
        const resolutions = data.available_resolutions
          .sort((r1, r2) =>
            r1.width === r2.width ? r2.height - r1.height : r2.width - r1.width
          )
          .map((res, index) => `${res.width}x${res.height}`);
        const triggerSchemes = Object.keys(triggerScheme);
        const triggerSchemesOptions = triggerSchemes.map((s) =>
          translateTriggerScheme(s)
        );
        const hasFocus = data.capabilities.includes("FOCUS");

        inputName.value = data.name;
        inputResolution.setOptions(resolutions);
        inputResolution.value = `${data.resolution.width}x${data.resolution.height}`;
        inputTriggerScheme.setOptions(triggerSchemesOptions);
        inputTriggerScheme.value = translateTriggerScheme(data.trigger_scheme);

        setVisible(inputFocus.parentNode, hasFocus);
        if (hasFocus) {
          inputFocus.value = Math.round(data.focus * 100);
        }

        btnConfirm.addEventListener("click", () => {
          const [resX, resY] = inputResolution.value
            .split("x")
            .map((val) => parseInt(val));
          const trigger_scheme =
            triggerSchemes[
              triggerSchemesOptions.indexOf(inputTriggerScheme.value)
            ];
          const focus = hasFocus ? {focus: inputFocus.value / 100} : {};
          getJson(`${apiCameraUrl}/config`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: inputName.value,
              resolution: {
                width: resX,
                height: resY,
              },
              trigger_scheme,
              ...focus
            }),
          })
            .then(() =>
              success(
                translate("ntf.success"),
                translate("ntf.camera-config-success")
              )
            )
            .catch(handleError)
            .finally(close);
        });
      })
      .catch(handleError);

    node.getElementById("no").addEventListener("click", () => close());

    return node;
  };
};

const openCameraSettingsModal = (cameraId) =>
  new Promise((resolve, reject) => {
    modal(createCameraSettingsModal(cameraId, resolve), {
      timeout: 0,
      closeOutside: false,
    });
  }).then(() => {
    lastUpdated = null;
    update();
  });

export default {
  load,
  update,
  getCameraNode,
  getCameraNodeId,
  updateCurrentCamera,
};
