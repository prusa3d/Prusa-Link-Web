// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import "./styles.css";
if (process.env.PRINTER_TYPE == "sla") {
  import("./sla-styles.module.css");
}
if (process.env.PRINTER_CODE == "m1") {
  import("./m1-styles.module.css");
}
import { navigate, navigateShallow } from "./router.js";
import printer from "./printer";
import { getJson, initAuth } from "./auth.js";
import { initMenu } from "./printer/components/menu";
import { translateLabels } from "./locale_provider";
import { handleError } from "./printer/components/errors";
import langSelect from "./printer/components/dropdown/language";
import { IStatusResponse, getPrinterStatus } from "./api";

declare var __COMMIT_HASH__: string;

const UPDATE_INTERVAL = process.env.UPDATE_INTERVAL;
let connectionProblem = false;

interface APIRequest<T> {
  get: () => Promise<T>;
  init: boolean;
  update: boolean;
  updateInterval?: number;
  timestamp?: number;
}

interface APIStatusRequest extends APIRequest<IStatusResponse> {
  type: "status";
}

type APIRequests = APIStatusRequest;
type APIRequestTypes = "status";

type Responses = {
  [k in APIRequestTypes]: {
    ok: boolean;
    payload?: any;
    error?: any;
  };
};

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
const requests: APIRequests[] = [
  {
    type: "status",
    get: () => getPrinterStatus(),
    init: true,
    update: true,
  },
];

async function getRequests(initialized) {
  const timestamp = new Date().getTime();
  const apiRequests = requests
    .map((request) => {
      const shouldGet = () => {
        if (!initialized) return request.init;

        if (request.update) {
          if (!request.updateInterval) return true;
          if (!request.timestamp) {
            request.timestamp = timestamp + request.updateInterval;
          }
          if (timestamp >= request.timestamp) {
            request.timestamp = timestamp + request.updateInterval;
            return true;
          }
        }
        return false;
      };
      return shouldGet()
        ? request
            .get()
            .then((payload) => ({
              type: request.type,
              payload,
            }))
            .catch((error) => ({
              type: request.type,
              no_connection: !error.code,
              error,
            }))
        : undefined;
    })
    .filter((request) => !!request);

  return Promise.all(apiRequests);
}

window.onload = () => {
  console.log(
    `${process.env.APP_NAME} v.${process.env.APP_VERSION} #${__COMMIT_HASH__}`
  );
  initMenu();
  langSelect.init("lang-dropdown", "lang-dropdown");
  translateLabels(null); // Translate menu and telemetry

  document.querySelectorAll("a[href]").forEach((link: HTMLLinkElement) => {
    link.addEventListener("click", (e) => {
      if (navigate(link.href)) e.preventDefault();
    });
  });

  initAuth().then((printer) => {
    if (printer) appLoop(printer);
  });
};

async function appLoop(printerInfo) {
  let initialized = false;

  while (true) {
    let apiProblem = false;

    try {
      const responses = await getRequests(initialized);
      const results = {};

      let hasConnectionError = false;

      responses.forEach((response) => {
        if ("payload" in response) {
          results[response.type] = response.payload;
        } else {
          if (response.no_connection) {
            hasConnectionError = true;
          }
          apiProblem = true;
          if (response.error) {
            handleApiError(response.error);
          }
        }
      });

      connectionProblem = hasConnectionError;

      if (initialized) {
        update(results);
      } else {
        if (!apiProblem) {
          init({ ...results, printer: printerInfo });
          initialized = true;
        }
      }
    } catch (result) {
      handleAppError(result);
    }

    printer.setConnected(!connectionProblem);
    await new Promise((resolve) =>
      setTimeout(resolve, parseInt(UPDATE_INTERVAL))
    );
  }
}

function init(responses) {
  try {
    printer.init(responses);
    window.onpopstate = (e) =>
      e && navigateShallow(e.currentTarget.location.hash || "#dashboard");
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
