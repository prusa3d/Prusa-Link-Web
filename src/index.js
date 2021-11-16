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
    if (!version)
      return;

    getJson("/api/printer").then((printerData) => {
      printer.init(version, printerData.data);
      appLoop();
      window.onpopstate = (e) => e && navigate(e.currentTarget.location.hash);
      navigate(window.location.hash || "#dashboard");
    });
  });
};

async function appLoop() {
  while (true) {
    await new Promise(resolve => setTimeout(resolve, UPDATE_INTERVAL));

    try {
      const [printerResponse, jobResponse] = await Promise.all([
        getJson("/api/printer"),
        getJson("/api/job"),
      ]);
      unpauseErrorHandling();
      connectionProblem = false;
      update(printerResponse, jobResponse)
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
  }
}

function update(printerResponse, jobResponse) {
  try {
    printer.update(printerResponse.data, jobResponse.data);
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
