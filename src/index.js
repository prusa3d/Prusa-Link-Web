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
import langSelect from "./printer/components/dropdown/language";

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
    // NOTE: I leave it like this until we change the API
    get: () => (process.env.PRINTER_TYPE === "sla") ? getJson("/api/printerprofiles") : new Promise(resolve => resolve({})),
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
  const timestamp = new Date().getTime();
  const apiRequests = Object.fromEntries(
    Object.entries(requests).map(([key, values]) => {
      const shouldGet = () => {
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
      return [key, shouldGet() ? values.get() : undefined];
    }).filter(([, values]) => values !== undefined)
  );

  const promises = Object.values(apiRequests);
  const responses = await Promise.all(
    promises.map(i => i
      .then(payload => { return { ok: true, payload, }; })
      .catch(error => { return { ok: false, error, }; })
    )
  );
  const result = Object.fromEntries(
    Object.entries(apiRequests).map(([key,], i) => [key, responses[i]])
  );
  return result;
}

window.onload = () => {
  console.log(`${process.env.APP_NAME} v.${process.env.APP_VERSION}`);
  initMenu();
  langSelect.init("lang-dropdown", "lang-dropdown");
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
    let apiProblem = false;

    try {
      const responses = await getRequests(initialized);
      if (responses.printer)
        connectionProblem = !responses.printer.ok;


      Object.values(responses).forEach(({ ok, error }) => {
        if (!ok) {
          apiProblem = true;
          handleApiError(error);
        }
      });

      if (initialized) {
        update(responses);
      } else {
        if (!apiProblem) {
          responses.version = { ok: true, payload: version };
          init(responses);
          initialized = true;
        }
      }
    } catch (result) {
      handleAppError(result);
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
  console.error(result);
}
