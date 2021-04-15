// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { Dropdown } from "./dropdown";
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

  const dropdown = Dropdown.init(document.getElementById("navbar"));
  if (dropdown) {
    dropdown.setOptions(getLanguages());
    dropdown.value = getLanguage();
    dropdown.onselect = (lang) => {
      setLanguage(lang);
      window.location.reload();
    };
  }
};
