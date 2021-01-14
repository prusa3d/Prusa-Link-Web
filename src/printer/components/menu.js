// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

// prettier-ignore
import { Dropdown } from "./dropdown";
import { getLanguage, getLanguages, setLanguage, translate } from "../../locale_provider";

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
  };

  document.querySelectorAll("#navbar a[href]").forEach((e) => {
    let path = e.href.split("#");
    if (path.length > 1) {
      switch (path[path.length - 1]) {
        case "dashboard":
          translate("home.link", { ref: e });
          break;
        case "projects":
          translate("proj.link", { ref: e });
          break;
        case "temperature":
          translate("temps.title", { ref: e });
          break;
      }
    }
  });
};
