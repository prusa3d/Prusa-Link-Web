// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later
import { getImage, getJson } from "../../auth";
import { setDisabled, setVisible } from "../../helpers/element";
import { translate } from "../../locale_provider";
import { success } from "./toast";
import { modal } from "./modal";
import { Dropdown } from "./dropdown";

let allowCloud = false;
let currentCameraId = null;
let cameras = [];

const triggerScheme = {
    "TEN_MIN": "TEN_MIN", // "Every 10 minutes"
    "EACH_LAYER": "EACH_LAYER", // "On layer change"
    "MANUAL": "MANUAL", // "Manual"
};

const translateTriggerScheme = (scheme) => {
    switch (scheme) {
        case triggerScheme.TEN_MIN:
            return translate("cameras.trigger-scheme.ten-min");
        case triggerScheme.EACH_LAYER:
            return translate("cameras.trigger-scheme.each-layer");
        case triggerScheme.MANUAL:
            return translate("cameras.trigger-scheme.manual");
        default:
            return `${scheme}`;
    }
};

const displaySuccess = () => success(translate("ntf.success"), translate("ntf.camera-suc"))

const load = (context) => {
    cameras = [];
    translate("cameras.link", { query: "#title-status-label" });
    update(context);
};

const update = (context, updateUI = updateCamerasUI) => {
    allowCloud = context.connection.states.connect.ok;
    getJson("/api/v1/cameras").then(result => {
        const list = (result?.data?.camera_list || []).map(
            item => {
                let camera = cameras.find(c => c.id === item.camera_id) || {};

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
            }
        );

        const removed = cameras.filter(cam1 => !list.find(cam2 => cam1.id === cam2.id));
        
        updateUI(list, removed);

        cameras = list;
    });

    cameras.filter(
        camera => camera.connected 
    ).forEach(camera => updateSnapshot(camera.id));
}

const getCameraNodeId = (cameraId) => `camera_${cameraId}`;

const getCameraNode = (cameraId) => document.getElementById(getCameraNodeId(cameraId));

const updateSnapshot = (cameraId) => {
    const camera = cameras.find(c => c.id === cameraId);
    if (!camera) return;

    if (camera.lastSnapshotAt && camera.nextSnapshotAt) {
        const now = new Date();
        if (now < camera.nextSnapshotAt) {
            return;
        }
    }

    getImage(`/api/v1/cameras/${cameraId}/snap`).then(({url, headers}) => {
        const camera = cameras.find(c => c.id === cameraId);
        const cameraNodeId = getCameraNodeId(cameraId);
        const noSnapshotNode = document.querySelector(`#${cameraNodeId} .camera__no-snapshot`);
        const snapshotNode = document.querySelector(`#${cameraNodeId} .camera__snapshot`);
        if (noSnapshotNode) {
            setVisible(noSnapshotNode, false);
        }
        if (snapshotNode) {
            setVisible(snapshotNode, true);
            snapshotNode.src = url;
        }
        if (camera) {
            const expires = headers["epires"];
            const date = headers["date"];
            const autoExpires = () => {
                const now = new Date();
                return new Date(now.getTime() + 10000);
            };
            camera.nextSnapshotAt = expires ? new Date(expires) : autoExpires();
            camera.lastSnapshotAt = date ? new Date(date) : new Date();
            camera.lastSnapshotUrl = url;
            if (!currentCameraId || camera.id === currentCameraId) {
                updateCurrentCamera(camera.id);
            }
        }
    });
};

const updateCurrentCamera = (cameraId) => {
    const camera = cameraId ? cameras.find(c => c.id === cameraId) : null;
    const [id, name, time, url] = camera?.lastSnapshotAt ? [
        camera.id, camera.config.name, camera.lastSnapshotAt.toLocaleString(), camera.lastSnapshotUrl
    ] : [
        null, '-', '-', ""
    ];
    currentCameraId = id;
    document.getElementById("camera-snapshot-picture").src = url;
    document.getElementById("camera-snapshot-time").innerText = time;
    document.getElementById("camera-snapshot-name").innerText = name;
}

const updateCameraNode = (cameraNode, camera, firstTime = false) => {
    cameraNode.querySelector(".camera__name").innerText = camera.config.name;
    cameraNode.querySelector(".camera__path").innerText = camera.config.path;
    cameraNode.querySelector(".camera__driver").innerText = camera.config.driver;
    cameraNode.querySelector(".camera__cloud").innerText = camera.config.registered
        ? translate("camera.cloud.linked")
        : translate("camera.cloud.not-linked");

    const btnRegister = cameraNode.querySelector(".camera__register");
    const btnUnregister = cameraNode.querySelector(".camera__unregister");
    const btnConnect = cameraNode.querySelector(".camera__connect");
    const btnDisconnect = cameraNode.querySelector(".camera__disconnect");
    const btnSettings = cameraNode.querySelector(".camera__settings");

    setVisible(btnRegister, allowCloud && camera.connected && !camera.registered);
    setVisible(btnUnregister, allowCloud && camera.connected && camera.registered);
    setVisible(btnConnect, !camera.connected && camera.detected);
    setVisible(btnDisconnect, false);
    setVisible(btnSettings, camera.connected);

    if (firstTime) {
        btnConnect.addEventListener("click", (e) => {
            e.stopPropagation();
            tryConnectCamera(camera.id);
        }, false);

        btnSettings.addEventListener("click", (e) => {
            e.stopPropagation();
            openCameraSettingsModal(camera.id);
        }, false);

        btnRegister.addEventListener("click", (e) => {
            e.stopPropagation();
            controlCloudConnection("POST");
        }, false)

        btnUnregister.addEventListener("click", (e) => {
            e.stopPropagation();
            controlCloudConnection("DELETE");
        }, false)
    }
};

const controlCloudConnection = (method) => {
    getJson(`/api/v1/cameras/connection`, {
        method
    }).finally(displaySuccess);
}

const tryConnectCamera = (cameraId) => {
    const camera = cameras.find(c => c.id === cameraId);
    if (camera) {
        getJson(`/api/v1/cameras/${camera.id}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                config: camera.config
            })
        }).then(() => displaySuccess());
    }
}

const createCameraNode = (camera) => {
    const template = document.getElementById("camera-list-item").content;
    const node = document.importNode(template, true);
    const listItemNode = node.querySelector("li");
    const cameraId = camera.id;

    listItemNode.addEventListener("click", (e) => {
        const camera = cameras.find(c => c.id === cameraId);
        if (camera) {
            if (camera.connected) {
                updateCurrentCamera(camera.id);
            } else {
                modal((close) => createConfirmCameraConnect(close, cameraId), {
                    timeout: 0,
                    closeOutside: true,
                });
            }
        }
        e.preventDefault();
    }, false);
    
    listItemNode.id = getCameraNodeId(camera.id);
    node.querySelector(".camera__path__label").innerText = translate("camera.path");
    node.querySelector(".camera__driver__label").innerText = translate("camera.driver");
    node.querySelector(".camera__cloud__label").innerText = translate("camera.cloud.label");

    setVisible(node.querySelector(".camera__snapshot"), false);
    updateCameraNode(node, camera, true);

    return node;
};

const updateCamerasUI = (list, removed) => {
    const listNode = document.getElementById("cameras-list");

    removed.forEach(camera => {
        const cameraNode = getCameraNode(camera.id);
        if (cameraNode) {
            listNode.removeChild(cameraNode);
        }
    })
    
    // update changed cameras
    list.sort(
        (cam1, cam2) => cam2.connected - cam1.connected
    ).forEach(
        camera => {
            const cameraNode = getCameraNode(camera.id);
            if (cameraNode) {
                updateCameraNode(cameraNode, camera);
            } else {
                const node = createCameraNode(camera);
                listNode.appendChild(node);
            }
        }
    )
};

const createConfirmCameraConnect = (close, cameraId) => {
    const template = document.getElementById("modal-question");
    const node = document.importNode(template.content, true);
    const yesButton = node.getElementById("yes");
    const noButton = node.getElementById("no");

    const label = node.getElementById("modal-question-label");
    label.innerText = translate("camera.try-connect");
    
    yesButton.addEventListener("click", (event) => {
      event.preventDefault();
      tryConnectCamera(cameraId);
      setDisabled(yesButton, true);
      setDisabled(noButton, true);
      close();
    });
    
    noButton.addEventListener("click", () => {
        close();
    });
    return node;
}

const createCameraSettingsModal = (cameraId, resolve) => {
    return (close) => {
        const apiCameraUrl = `/api/v1/cameras/${cameraId}`;
        const template = document.getElementById(`modal-camera-settings`);
        const node = document.importNode(template.content, true);
        
        const inputName = node.getElementById("camera-settings__name");

        const inputResolution = Dropdown.init(
            node.getElementById("camera-settings__resolution"), "camera-settings__resolution"
        );
        const inputTriggerScheme = Dropdown.init(
            node.getElementById("camera-settings__trigger-scheme"), "camera-settings__trigger-scheme"
        );

        const btnConfirm = node.getElementById("yes");

        getJson(apiCameraUrl).then(res => {
            const data = res.data;
            const resolutions = data.available_resolutions.sort(
                (r1, r2) => r1.width === r2.width ? r2.height - r1.height : r2.width - r1.width
            ).map((res, index) => `${res.width}x${res.height}`);
            const triggerSchemes = ["TEN_MIN", "EACH_LAYER", "MANUAL"];
            const triggerSchemesOptions = triggerSchemes.map(s => translateTriggerScheme(s));

            inputName.value = data.name;
            inputResolution.setOptions(resolutions);
            inputResolution.value = `${data.resolution.width}x${data.resolution.height}`;
            inputTriggerScheme.setOptions(triggerSchemesOptions);
            inputTriggerScheme.value = translateTriggerScheme(data.trigger_scheme);

            btnConfirm.addEventListener("click", () => {
                const [resX, resY] = inputResolution.value.split("x").map(val => parseInt(val));
                const trigger_scheme = triggerSchemes[
                    triggerSchemesOptions.indexOf(inputTriggerScheme.value)
                ];
                getJson(`${apiCameraUrl}/config`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name: inputName.value,
                        resolution: {
                            width: resX,
                            height: resY,
                        },
                        trigger_scheme,
                    })
                })
                .finally(close);
            });
        });

        node.getElementById("no").addEventListener("click", () => close());

      return node;
    };
};
  

const openCameraSettingsModal = (cameraId) => new Promise((resolve, reject) => {
    modal(createCameraSettingsModal(cameraId, resolve), {
        timeout: 0,
        closeOutside: false,
    });
}).then(() => {
    lastUpdated = null;
    update();
});

export default { load, update, getCameraNode, getCameraNodeId, updateCurrentCamera };