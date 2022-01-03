// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { translate } from "../../locale_provider";
import updateProperties from "./updateProperties";
import { getJson } from "../../auth";
import { setEnabled, setVisible } from "../../helpers/element";
import { editPrinter, editSerialNumber, editUser, getSerialNumber } from "./settingsActions";
import { handleError } from "./errors";
import { success } from "./toast";

let serialNumber = null;
const logsModule = process.env.WITH_LOGS ? require("./settings/logs").default : null;
const displaySuccess = () => success(translate("ntf.success"), translate("ntf.settings-suc"));

const load = (context) => {
  translate("settings.title", { query: "#title-status-label" });
  initBaseSettings();
  initConnectionSettings(context);
  initPrinterSettings();
  initUserSettings();
  initSerialSettings();
  logsModule?.load();
};

function initBaseSettings() {
  getJson("api/version?system=true").then(result => {
    const data = {
      version: result.data
    };
    updateProperties("settings", data);
    updateSystemVersionProperties(data);
  }).catch((result) => handleError(result));
}

function initConnectionSettings(context) {
  const { connection } = context;
  updateProperties("con-settings", connection);
  updatePrusaConnectStatus(connection);
  updatePrinterStatus(connection);
}

function initPrinterSettings() {
  const nameInput = document.querySelector("#settings #printer-name");
  const locationInput = document.querySelector("#settings #printer-location");
  const editBtn = document.querySelector("#settings #edit-printer");

  const updateEditBtn = () =>
    setEnabled(editBtn, nameInput.value.length > 0 && locationInput.value.length > 0);
  nameInput.oninput = updateEditBtn;
  locationInput.oninput = updateEditBtn;

  getJson("api/settings").then(result => {
    const data = result.data;
    nameInput.value = data.printer?.name || "";
    locationInput.value = data.printer?.location || "";
  }).catch((result) => handleError(result))
    .finally(() => {
      updateEditBtn();
      editBtn.onclick = () => {
        editPrinter(nameInput.value, locationInput.value)
          .then((result) => displaySuccess())
          .catch((result) => handleError(result));
      }
    });
}

function initUserSettings() {
  const usernameInput = document.querySelector("#settings #username");
  const passwordInput = document.querySelector("#settings #password");
  const newPasswordInput = document.querySelector("#settings #new-password");
  const rePasswordInput = document.querySelector("#settings #re-password");
  const editBtn = document.querySelector("#settings #edit-user");

  const updateEditBtn = () =>
    setEnabled(editBtn,
      passwordInput.value.length > 0
      && (usernameInput.value.length > 0
        || (newPasswordInput.value.length > 0 && rePasswordInput.value.length > 0))
    );
  usernameInput.oninput = updateEditBtn;
  passwordInput.oninput = updateEditBtn;
  newPasswordInput.oninput = updateEditBtn;
  rePasswordInput.oninput = updateEditBtn;

  getJson("api/settings").then(result => {
    const data = result.data;
    usernameInput.value = data.user?.username || "";
  }).catch((result) => handleError(result))
    .finally(() => {
      updateEditBtn();
      editBtn.onclick = () => {
        editUser(passwordInput.value, {
          username: usernameInput.value || undefined,
          newPassword: newPasswordInput.value || undefined,
          rePassword: rePasswordInput.value || undefined,
        }).then((result) => displaySuccess())
          .catch((result) => handleError(result));
      }
    });
}

function initSerialSettings() {
  const input = document.querySelector("#settings #serial");
  const btn = document.querySelector("#settings #edit-serial");

  const updateSerialControls = () => {
    if (input && btn) {
      if (serialNumber)
        input.value = `${serialNumber}`;

      const updateBtn = () => {
        setEnabled(btn, !serialNumber && input.value.length > 0)
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
      }

      input.onkeyup = (event) => {
        if (event.key === "Enter") {
          submit();
          input.blur(); // unfocus
        }
      }
      btn.onclick = submit;
    }
  }

  getSerialNumber().then((result) => {
    serialNumber = result.data.serial;
  }).catch((result) => handleError(result))
    .finally(() => updateSerialControls());
}

function updateConnectionStatus(statusElm, msgElm, ok, message, customMessage) {
  if (statusElm)
    statusElm.setAttribute("ok", Boolean(ok));
  if (msgElm)
    msgElm.innerHTML = (ok ? "" : message + "</br>") + customMessage;
}

function updatePrusaConnectStatus(data) {
  console.log(data);
  const statusElm = document.getElementById("conn-prusa-connect-status");
  const msgElm = document.getElementById("conn-prusa-connect-status-msg");

  const { hostname, port, tls } = data.connect;
  const { ok, message } = data.states.connect;
  const protocol = tls ? 'http' : 'https'
  const port = port ? `:${port}` : '' // 0 = protocol default port
  const customMessage =  `(${protocol}://${hostname}${port})`;

  updateConnectionStatus(statusElm, msgElm, ok, message, customMessage);
}

function updatePrinterStatus(data) {
  const statusElm = document.getElementById("conn-printer-status");
  const msgElm = document.getElementById("conn-printer-status-msg");

  const { port, baudrate } = data.current;
  const { ok, message } = data.states.printer;
  const customMessage = `(${port || 8080} @ ${baudrate || 0}bps)`;

  updateConnectionStatus(statusElm, msgElm, ok, message, customMessage);
}

const update = () => {
  logsModule?.update();
};

// TODO: Cleanup the hardcoded classes after completing the layout for settings page
function updateSystemVersionProperties(data) {
  const table = document.querySelector('#sys-version .table');
  if (table) {
    for (const [key, value] of Object.entries(data.version.system)) {
      const row = document.createElement("div");
      row.className = "row";

      const col_key = document.createElement("div");
      col_key.className = "col txt-size-3";
      col_key.innerHTML = `<p class="txt-bold txt-grey">${translateLabel(key)}</p>`;
      row.appendChild(col_key)

      const col_value = document.createElement("div");
      col_value.className = "col txt-size-2";
      col_value.innerHTML = `<p>${value}</p>`;
      row.appendChild(col_value)

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
    default: return key;
  }
}

export default { load, update };
