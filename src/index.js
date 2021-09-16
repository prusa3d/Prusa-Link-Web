// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import "./styles.css";
if (process.env.TYPE == "m1") {
  import("./m1-styles.css");
}
import { navigate } from "./router.js";
import printer from "./printer";
import { getJson, initAuth } from "./auth.js";
import { initMenu } from "./printer/components/menu";
import { translateLabels } from "./locale_provider";

const UPDATE_INTERVAL = process.env.UPDATE_INTERVAL;

window.onload = () => {
  initMenu();
  translateLabels(); // Translate menu and telemetry

  document.querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("click", (e) => {
      if (navigate(link.href)) {
        document.title = process.env.TITLE + " - " + link.innerText;
        history.pushState(null, document.title, link.href);
        e.preventDefault();
      }
    });
  });

  initAuth().then((version) => {
    if (version == null) {
      return;
    }

    getJson("/api/printer").then((printerData) => {
      getJson("/api/connection").then((connection) => {
        printer.init(version, printerData.data, connection.data);
        setInterval(
          () =>
            getJson("/api/printer")
              .then((data) => {
                printer.update(data.data);
              })
              .catch((data) => {
                if (data.code == 401) {
                  const auth = sessionStorage.getItem("auth") || "false";
                  if (auth == "false") {
                    initAuth();
                  }
                }
              }),
          UPDATE_INTERVAL
        );
        window.onpopstate = (e) => e && navigate(e.currentTarget.location.hash);
        navigate(window.location.hash || "#dashboard");
      });
    });
  });
};
