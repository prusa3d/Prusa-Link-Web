// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getLanguage, getLanguages, setLanguage } from "../../locale_provider";

export const initMenu = () => {
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

  // Fill language selector with available languages
  let langSelector = document.getElementById("lang");
  langSelector.innerHTML = getLanguages()
    .map((lang) => `<option value="${lang}">${lang.toUpperCase()}</option>`)
    .join("\n");
  langSelector.value = getLanguage();

  document.getElementById("lang").addEventListener("change", (e) => {
    if (setLanguage(e.currentTarget.value)) window.location.reload();
  });
};
