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
import { navigate } from "./router.js";
import printer from "./printer";
import { getJson, initAuth } from "./auth.js";
import { initMenu } from "./printer/components/menu";
import { translate, translateLabels } from "./locale_provider";
import { handleError, pauseErrorHandling, unpauseErrorHandling } from "./printer/components/errors";

const UPDATE_INTERVAL = process.env.UPDATE_INTERVAL;
let appErrorTimestamp = 0;
const APP_ERROR_INTERVAL = 60_000; // ms
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
  job: {
    get: () => getJson("/api/job"),
    init: false,
    update: true
  },
  connection: {
    get: () => getJson("/api/connection"),
    init: true,
    update: true,
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
  initMenu();
  translateLabels(); // Translate menu and telemetry

  document.querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("click", (e) => {
      if (navigate(link.href)) {
        const hostnameLabel = document.getElementById("title-hostname").innerHTML;
        document.title =
          hostnameLabel + " - " +
          (link.innerText.trim() || process.env.APP_NAME) +
          " - " + process.env.APP_NAME;
        history.pushState(null, document.title, link.href);
        e.preventDefault();
      }
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
      unpauseErrorHandling();
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
        if (!connectionProblem) {
          handleError(result, {
            fallbackMessage: {
              title: "API error",
              message: "Cannot connect to printer",
            },
          });
        }
        pauseErrorHandling();
        connectionProblem = true;
      }
    }
    printer.setConnected(!connectionProblem);
    await new Promise(resolve => setTimeout(resolve, UPDATE_INTERVAL));
  }
}

function init(responses) {
  printer.init(responses);
  window.onpopstate = (e) => e && navigate(e.currentTarget.location.hash);
  navigate(window.location.hash || "#dashboard");
}

function update(responses) {
  try {
    printer.update(responses);
  } catch (error) {
    const timestamp = new Date().getTime();
    if (timestamp > appErrorTimestamp) {
      appErrorTimestamp = timestamp + APP_ERROR_INTERVAL;
      handleError(error, {
        fallbackMessage: {
          title: "Application error",
          message: "Something bad happened on application side",
        },
      });
    }
  }
}
