// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import "./styles.css";
if (process.env.PRINTER_TYPE == "sla") {
  import("./sla-styles.css");
}
if (process.env.PRINTER_CODE == "m1") {
  import("./m1-styles.css");
}
import "./layout";
import { navigate, navigateShallow } from "./router.js";
import printer from "./printer";
import { getJson, initAuth } from "./auth.js";
import { initMenu } from "./printer/components/menu";
import { translate, translateLabels } from "./locale_provider";
import { handleError } from "./printer/components/errors";

const UPDATE_INTERVAL = process.env.UPDATE_INTERVAL;
let connectionProblem = false;

/** Contains setup for global api requests.
 *
 * `get` - function that will be called to fetch api
 *
 * `init` - get api when initializing app?
 *
 * `update` - get api when update
 *
 * `updateInterval` - change if you want bigger delay than UPDATE_INTERVAL.
 * Time is only approximate, it is not guaranteed!
 */
const requests = {
  printer: {
    get: () => getJson("/api/printer"),
    init: true,
    update: true
  },
  profiles: {
    get: () => getJson("/api/printerprofiles"),
    init: true,
    update: false
  },
  job: {
    get: () => getJson("/api/job"),
    init: false,
    update: true
  },
  connection: {
    get: () => getJson("/api/connection"),
    init: process.env.WITH_CONNECTION,
    update: process.env.WITH_CONNECTION,
    updateInterval: process.env.CONNECTION_UPDATE_INTERVAL,
  },
  // version will be passed on init
};

async function getRequests(initialized) {
  const entries = Object.entries(requests);
  const timestamp = new Date().getTime();

  const promises = entries.map(([, values]) => {
    function shouldGet() {
      if (!initialized)
        return values.init;

      if (values.update) {
        if (!values.updateInterval)
          return true;
        if (!values.timestamp)
          values.timestamp = timestamp + values.updateInterval;
        if (timestamp >= values.timestamp) {
          values.timestamp = timestamp + values.updateInterval;
          return true;
        }
      }
    }
    return shouldGet() ? values.get() : Promise.resolve(null);
  });

  const responses = await Promise.all(promises);
  let result = new Object();
  for (let i = 0; i < entries.length; i++) {
    const [key,] = entries[i];
    const value = responses[i];
    result[key] = value;
  }

  return result;
}

window.onload = () => {
  console.log(`${process.env.APP_NAME} v.${process.env.APP_VERSION}`);
  initMenu();
  translateLabels(); // Translate menu and telemetry

  document.querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("click", (e) => {
      if (navigate(link.href))
        e.preventDefault();
    });
  });

  initAuth().then((version) => {
    if (version)
      appLoop(version);
  });
};

async function appLoop(version) {
  let initialized = false;

  while (true) {
    try {
      const responses = await getRequests(initialized);
      connectionProblem = false;

      if (initialized) {
        update(responses)
      } else {
        responses.version = version;
        init(responses);
        initialized = true;
      }
    } catch (result) {
      if (result.code == 401) {
        const auth = sessionStorage.getItem("auth") || "false";
        if (auth == "false") {
          initAuth();
        }
      } else {
        handleApiError(result);
        connectionProblem = !result.code;
      }
    }
    printer.setConnected(!connectionProblem);
    await new Promise(resolve => setTimeout(resolve, UPDATE_INTERVAL));
  }
}

function init(responses) {
  try {
    printer.init(responses);
    window.onpopstate = (e) => e && navigateShallow(e.currentTarget.location.hash || "#dashboard");
    navigateShallow(window.location.hash || "#dashboard");
  } catch (error) {
    handleAppError(error);
  }
}

function update(responses) {
  try {
    printer.update(responses);
  } catch (error) {
    handleAppError(error);
  }
}

function handleApiError(result) {
  handleError(result, {
    fallbackMessage: {
      title: "API error",
      message: "Cannot connect to printer",
    },
  });
}

function handleAppError(result) {
  handleError(result, {
    fallbackMessage: {
      title: "Application error",
      message: "Something bad happened on application side",
    },
  });
}
