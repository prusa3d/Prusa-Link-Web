// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import "./styles.css";
import { navigate } from "./router.js";
import printer from "./printer";
import { getJson, initAuth } from "./auth.js";
import testLocale from "./locale_test";

const UPDATE_INTERVAL = process.env.UPDATE_INTERVAL;

window.onload = () => {
  document.getElementById("menu").addEventListener("click", (e) => {
    const menu = document.getElementById("menu");
    if (menu.className == "navbar-burger") {
      menu.className = "navbar-burger burger-open";
      document.getElementById("navbar").className = "";
    } else {
      menu.className = "navbar-burger";
      document.getElementById("navbar").className = "burger-menu";
    }
  });
  document.querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("click", (e) => {
      if (navigate(link.href)) {
        document.title = "Original Prusa Mini - " + link.innerText;
        history.pushState(null, document.title, link.href);
        e.preventDefault();
      }
    });
  });

  initAuth().then(version => {
    getJson("/api/printer", (status, printerData) => {
      if (status.ok) {
        printer.init(version, printerData);
        setInterval(() => getJson("/api/printer", printer.update), UPDATE_INTERVAL);
      } else {
        console.error(`Cant get printer API! Error ${status.code}`);
        console.error(printerData);
      }
      window.onpopstate = (e) => e && navigate(e.location);
      navigate(window.location.hash || "#dashboard");
      testLocale();
    });
  })
};