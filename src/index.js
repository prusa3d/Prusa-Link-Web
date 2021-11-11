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
import { handleError } from "./printer/components/errors";

const UPDATE_INTERVAL = process.env.UPDATE_INTERVAL;

let apiErrorTimestamp = 0;
const API_ERROR_INTERVAL = 60_000; // ms

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
      setInterval(
        () =>
            Promise.all([
              getJson("/api/printer"),
              getJson("/api/job"),
            ]).then(([printerResponse, jobResponse]) => {
              printer.update(printerResponse.data, jobResponse.data);
            })
            .catch((result) => {
              if (result.code == 401) {
                const auth = sessionStorage.getItem("auth") || "false";
                if (auth == "false") {
                  initAuth();
                }
              } else {
                const timestamp = new Date().getTime();
                if (timestamp > apiErrorTimestamp) {
                  apiErrorTimestamp = timestamp + API_ERROR_INTERVAL;
                  handleError(result, {
                    fallbackMessage: {
                      title: "API error",
                      message: "Something bad happened on printer's side",
                    },
                  });
                }
              }
            }),
        UPDATE_INTERVAL
      );
      window.onpopstate = (e) => e && navigate(e.currentTarget.location.hash);
      navigate(window.location.hash || "#dashboard");
    });
  });
};
