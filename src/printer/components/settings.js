// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { translate } from "../../locale_provider";
import updateProperties from "./updateProperties";
import { getJson } from "../../auth";
import { setDisabled, setEnabled, setHidden, setVisible } from "../../helpers/element";
import {
  editPrinter,
  editSerialNumber,
  editUser,
  getSerialNumber,
} from "./settingsActions";
import { handleError } from "./errors";
import { success } from "./toast";
import { modal } from "./modal";

let serialNumber = null;
let prusaLinkVersion = null;
let connectUrl = null;

const logsModule = process.env.WITH_LOGS
  ? require("./settings/logs").default
  : null;
const displaySuccess = () =>
  success(translate("ntf.success"), translate("ntf.settings-suc"));

const load = (context) => {
  translate("settings.title", { query: "#title-status-label" });
  initBaseSettings();
  if (process.env.WITH_SYSTEM_UPDATES) initSystemUpdates();
  if (process.env.WITH_CONNECTION) initConnectionSettings(context);
  initSettings();
  if (process.env.WITH_SERIAL) initSerialSettings();
  if (process.env.WITH_API_KEY_SETTING) initApiKey();
  logsModule?.load();
  context.updateConnection();
};

const update = (context) => {
  logsModule?.update();
  updateConnectionSettings(context, false);
};

function initApiKey() {
  const resetApiKeyButton = document.getElementById("api_key-reset");
  if (resetApiKeyButton) {
    resetApiKeyButton.addEventListener(
      "click",
      () => {
        getJson("api/settings/apikey", { method: "POST" })
          .then((result) => {
            updateApiKey(result.data["api-key"]);
            displaySuccess(result);
          })
          .catch((result) => handleError(result));
      },
      false
    );
  }
}

function updateApiKey(apiKey) {
  const apiKeyInput = document.getElementById("api_key");
  if (apiKeyInput) {
    apiKeyInput.innerText = apiKey;
  }
}

function initBaseSettings() {
  getJson("api/version?system=1")
    .then((result) => {
      const data = {
        version: result.data,
      };
      prusaLinkVersion = data.version.server;
      updateProperties("settings", data);
      updateSystemVersionProperties(data);
    })
    .catch((result) => handleError(result));
}

function initSystemUpdates() {
  const checkUpdatesBtn = document.getElementById("updates-check");
  const checkUpdatesSpinner = document.getElementById("updates-check__spinner");
  const setInProgress = value => {
    if (value) {
      document.querySelectorAll(".update-pkg").forEach(entry => {
        entry.parentNode.removeChild(entry);
      });
    }
    setVisible(checkUpdatesSpinner, value);
    setEnabled(checkUpdatesBtn, !value);
  }
  if (checkUpdatesBtn && checkUpdatesSpinner) {
    checkUpdatesBtn.onclick = () => {
      setInProgress(true);
           
      getJson("/api/v1/update/prusalink")
        .then(result => {
          const new_version = result.data?.new_version;
          const available_updates = [{
            name: "PrusaLink",
            new_version
          }];
          const tableNode = checkUpdatesBtn
            .parentNode // col
            .parentNode // row
            .parentNode;
 
          available_updates.forEach(entry => {
            const row = document.createElement('div');
            const label = document.createElement('div');
            const labelText = document.createElement('p');
            const value = document.createElement('div');
            const valueText = document.createElement('p');
            const action = document.createElement('div');
            const currentVersion = document.createElement('span');
            const arrow = document.createElement('span');
            const availableVersion = document.createElement('span');

            const target = "PrusaLink"

            row.className = "row update-pkg";
            label.className = "col";
            value.className = "col";
            action.className = "col";
            labelText.className = "txt-bold txt-grey txt-sm";
            valueText.className = "txt-md";
            currentVersion.className = "txt-grey txt-sm"
            availableVersion.className = "txt-grey txt-sm"
            labelText.innerText = target;
            arrow.innerHTML = " &rarr; ";

            if (entry.new_version) {
              currentVersion.innerText = prusaLinkVersion; 
              availableVersion.innerText = entry.new_version; 
              const button = document.createElement('button');
              const buttonLabel = document.createElement('p');
              buttonLabel.innerText = translate("btn.upgrade");
              button.className = 'action';
              button.appendChild(buttonLabel);
              action.appendChild(button);
              button.onclick = () => modal(
                (close) => createSysupgradeModal(close, target, entry.new_version), {
                  timeout: 0,
                  closeOutside: false,
                }
              );
            } else {
              availableVersion.innerText = "The package is up to date";
            }

            valueText.appendChild(currentVersion);
            valueText.appendChild(arrow);
            valueText.appendChild(availableVersion);
            label.appendChild(labelText);
            value.appendChild(valueText);
            row.appendChild(label);
            row.appendChild(value);
            row.appendChild(action);
            tableNode.appendChild(row);
          });
        })
        .catch(e => handleError(e))
        .finally(() => setInProgress(false));
    }
  }
}

function initConnectionSettings(context) {
  updateConnectionSettings(context, true);

  document
    .getElementById("edit-connect-del")
    .addEventListener("click", (event) => {
      getJson("api/connection", { method: "DELETE" })
        .then(displaySuccess)
        .catch((result) => handleError(result))
        .finally(() => context.updateConnection())
    });

  const linkButton = document.getElementById("edit-connect-set");
  const linkButtonSpinner = document.getElementById("edit-connect-set__spinner");
  const setInProgress = value => {
    if (value) {
      document.querySelectorAll(".update-pkg").forEach(entry => {
        entry.parentNode.removeChild(entry);
      });
    }
    setVisible(linkButtonSpinner, value);
    setEnabled(linkButton, !value);
  }

  linkButton.addEventListener("click", (event) => {
      setInProgress(true);
      const val = document.getElementById("conn-prusa-connect-url")?.value;
      if (!val) return;
      const url = new URL(val);
      getJson("api/connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          connect: {
            hostname: url.hostname,
            port: url.port ? parseInt(url.port) : 0,
            tls: url.protocol.startsWith("https") ? 1 : 0,
          },
        }),
      })
        .then((result) => {
          const url = result?.data?.url;
          url && window.open(url, "_blank");
          setTimeout(() => {
            context.updateConnection()
              .finally(() => setInProgress(false))
          }, 5000)
        })
        .catch((result) => {
          setInProgress(false);
          handleError(result)
        });
    });
}

function updateConnectionSettings(context, updateInputValue) {
  updateProperties("con-settings", context.link);
  updatePrusaConnectStatus(context.link, updateInputValue);
  updatePrinterStatus(context.state, context.link);
}

function initSettings() {
  getJson("api/settings")
    .then((result) => {
      const settings = result.data;
      initPrinterSettings(settings);
      initUserSettings(settings);
    })
    .catch((result) => handleError(result));
}

function initPrinterSettings(settings) {
  const nameInput = document.querySelector("#settings #printer-name");
  const locationInput = document.querySelector("#settings #printer-location");
  const networkErrorChimeInput = document.querySelector("#settings #printer-network_error_chime");
  const editBtn = document.querySelector("#settings #edit-printer");
  const updateEditBtn = () => {
    setEnabled(
      editBtn,
      nameInput.value.length > 0 && locationInput.value.length > 0
    );
  };

  nameInput.oninput = updateEditBtn;
  locationInput.oninput = updateEditBtn;
  networkErrorChimeInput.oninput = updateEditBtn;

  nameInput.value = settings.printer?.name || "";
  locationInput.value = settings.printer?.location || "";
  networkErrorChimeInput.checked = !!settings.printer?.network_error_chime;

  if ("api-key" in settings) {
    updateApiKey(settings["api-key"]);
  }

  editBtn.onclick = () => {
    editPrinter({
      name: nameInput.value,
      location: locationInput.value,
      network_error_chime: networkErrorChimeInput.checked,
    })
      .then(() => displaySuccess())
      .catch((result) => handleError(result));
  };

  updateEditBtn();
}

function initUserSettings(settings) {
  const usernameInput = document.querySelector("#settings #username");
  const passwordInput = document.querySelector("#settings #password");
  const newPasswordInput = document.querySelector("#settings #new-password");
  const rePasswordInput = document.querySelector("#settings #re-password");
  const editBtn = document.querySelector("#settings #edit-user");

  const updateEditBtn = () => {
    setEnabled(
      editBtn,
      passwordInput.value.length > 0 &&
        (usernameInput.value.length > 0 ||
          (newPasswordInput.value.length > 0 &&
            rePasswordInput.value.length > 0))
    );
  };

  usernameInput.oninput = updateEditBtn;
  passwordInput.oninput = updateEditBtn;
  newPasswordInput.oninput = updateEditBtn;
  rePasswordInput.oninput = updateEditBtn;

  usernameInput.value = settings.username || "";

  updateEditBtn();
  editBtn.onclick = () => {
    editUser(passwordInput.value, {
      username: usernameInput.value || undefined,
      newPassword: newPasswordInput.value || undefined,
      rePassword: rePasswordInput.value || undefined,
    })
      .then(() => displaySuccess())
      .catch((result) => handleError(result));
  };
}

function initSerialSettings() {
  const input = document.querySelector("#settings #serial");
  const btn = document.querySelector("#settings #edit-serial");

  const updateSerialControls = () => {
    if (input && btn) {
      if (serialNumber) input.value = `${serialNumber}`;

      const updateBtn = () => {
        setEnabled(btn, !serialNumber && input.value.length > 0);
        setVisible(btn, !serialNumber);
      };

      updateBtn();
      input.oninput = updateBtn;
      setEnabled(input, !serialNumber);

      const submit = () => {
        editSerialNumber(input.value)
          .then((result) => {
            serialNumber = result.data.serial;
            displaySuccess();
          })
          .catch((result) => handleError(result))
          .finally(() => updateSerialControls());
      };

      input.onkeyup = (event) => {
        if (event.key === "Enter") {
          submit();
          input.blur(); // unfocus
        }
      };
      btn.onclick = submit;
    }
  };

  getSerialNumber()
    .then((result) => {
      serialNumber = result.data.serial;
    })
    .catch((result) => handleError(result))
    .finally(() => updateSerialControls());
}

function updateConnectionStatus(statusElm, msgElm, ok, message, customMessage) {
  if (statusElm) statusElm.setAttribute("ok", Boolean(ok));
  if (msgElm)
    msgElm.innerHTML =
      (ok ? translate("conn.suc") : message) + "</br>" + customMessage;
}

function updatePrusaConnectStatus(data, updateInputValue) {
  const statusElm = document.getElementById("conn-prusa-connect-status");
  const urlIn = document.getElementById("conn-prusa-connect-url");
  const unlinkButton = document.getElementById("edit-connect-del");

  const isFinished = data.connect.registration === "FINISHED";
  const { hostname, tls, port } = data.connect.settings;
  const { ok, message } = data.connect;
  const ready = ok && isFinished;
  const msgElm = document.getElementById(
    `conn-prusa-connect-status-${ready ? "ok" : "not-ok"}`
  );
  const protocol = tls ? "https" : "http";
  const urlString = `${protocol}://${hostname}${port || ""}`;
  const customMessage = `(${urlString})`;

  if (updateInputValue || connectUrl !== urlString) {
    urlIn.value = urlString;
    connectUrl = urlString;
  }
  setHidden(urlIn.parentNode.parentNode, isFinished);
  if (unlinkButton) {
    setVisible(unlinkButton, isFinished || !ok);
  }

  updateConnectionStatus(statusElm, msgElm, ready, message, customMessage);
}

function updatePrinterStatus(state, link) {
  const statusElm = document.getElementById("conn-printer-status");

  const { port, baudrate } = link.printer.settings;
  const { ok, message } = link.printer;
  const msgElm = document.getElementById(
    `conn-printer-status-${ok ? "ok" : "not-ok"}`
  );
  const customMessage = `(${port || "/dev/ttyACM0"} @ ${baudrate || 0}bps)`;

  updateConnectionStatus(statusElm, msgElm, ok, message, customMessage);
}

function updateSystemVersionProperties(data) {
  const table = document.querySelector("#sys-version .table");
  if (table) {
    for (const [key, value] of Object.entries(data.version.system)) {
      const row = document.createElement("div");
      row.className = "row";

      const col_key = document.createElement("div");
      col_key.className = "col txt-sm";
      col_key.innerHTML = `<p class="txt-bold txt-grey">${translateLabel(
        key
      )}</p>`;
      row.appendChild(col_key);

      const col_value = document.createElement("div");
      col_value.className = "col txt-md";
      col_value.innerHTML = `<p>${value}</p>`;
      row.appendChild(col_value);

      table.appendChild(row);
    }
  }
}

function translateLabel(key) {
  switch (key.toLowerCase()) {
    case "python":
      return translate("sys-version.python");
    case "description":
      return translate("sys-version.description");
    case "id":
      return translate("sys-version.id");
    case "os":
      return translate("sys-version.os");
    default:
      return key;
  }
}

const createSysupgradeModal = (close, target, version) => {
  const template = document.getElementById("modal-sysupgrade");
  const node = document.importNode(template.content, true);

  const targetLabel = node.getElementById("modal-sysupgrade__target");
  const currentLabel = node.getElementById("modal-sysupgrade__current");
  const versionLabel = node.getElementById("modal-sysupgrade__version");
  const statusLabel = node.getElementById("modal-sysupgrade__status");
  const spinner = node.getElementById("modal-sysupgrade__spinner");
  
  const yesButton = node.getElementById("yes");
  const noButton = node.getElementById("no");

  targetLabel.innerText = target;
  currentLabel.innerText = prusaLinkVersion;
  versionLabel.innerText = version;

  yesButton.addEventListener("click", (event) => {
    event.preventDefault();
    setDisabled(yesButton, true);
    setDisabled(noButton, true);
    setVisible(yesButton, false);
    setVisible(noButton, false);
    setVisible(spinner, true);

    statusLabel.innerText = translate("msg.sysupgrade.pending")

    getJson("/api/v1/update/prusalink", {method: "POST"})
      .then(() => {
        statusLabel.innerText = translate("msg.sysupgrade.wait-for-printer")
        return waitForSysupgrade(version)
      })
      .catch(e => handleError(e))
      .finally(() => {
        close();
        window.location.href = "/";
      });
  });
  
  noButton.addEventListener("click", () => close());
  return node;
}

const waitForSysupgrade = (version) => {
  return new Promise((resolve, reject) => {
    const checkVersion = () => {
      return getJson("/api/version")
        .then(data => {
          resolve()
          // TODO: we can also consider version verification here
          // if (data.server === version) {
          //   resolve(true)
          // } else {
          //   setTimeout(checkVersion, 1000)
          // }
        })
        .catch(e => setTimeout(checkVersion, 2500))
    }
    setTimeout(checkVersion, 5000)
  });
}

export default { load, update };
