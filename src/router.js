// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import printer from "./printer";

const navigate = (url) => {
  const [_, page] = url.split("#");
  if (!page) return false;
  const route = printer.routes.find((r) => r.path === page);
  if (!route) return false;
  const root = document.getElementById("root");
  root.innerHTML = "";
  new DOMParser()
    .parseFromString(route.html, "text/html")
    .body.childNodes.forEach((n) => root.appendChild(n));
  route.module.load();
  printer.setModule(route.module);
  const elm = document.querySelector(`a[href="#${page}"]`);
  if (elm) {
    document.getElementById("navbar").childNodes.forEach((elm) => {
      elm.className = "";
    });
    elm.parentNode.className = "active";
  }
  return true;
};

export { navigate };
