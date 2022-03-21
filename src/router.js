// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { updateTelemetryVisibility } from "./layout";
import { translateLabels } from "./locale_provider";
import printer from "./printer";

function doNavigate (url, pushIntoHistory) {
  const [_, page] = url.split("#");
  if (!page) return false;
  const route = printer.routes.find((r) => r.path === page);
  if (!route) return false;

  if (pushIntoHistory)
    tryPushIntoHistory("#" + page);

  const root = document.getElementById("root");
  rebuildDOM(route.html, root);
  translateLabels(root);
  updateNavbar(page);
  tryChangeTitle(route.getTitle);
  updateTelemetryVisibility();
  window.scrollTo({ top: 0 });

  route.module.load();
  printer.setModule(route.module);

  return true;
};

function tryPushIntoHistory(url) {
  if (window.location.hash != url)
    history.pushState(null, "", url);
}

function tryChangeTitle(getTitle) {
  if (getTitle) {
    document.title = getTitle();
  }
}

function rebuildDOM(html, root) {
  root.innerHTML = "";
  new DOMParser()
    .parseFromString(html, "text/html")
    .body.childNodes.forEach((n) => root.appendChild(n));
}

function updateNavbar(page) {
  const elm = document.querySelector(`a[href="#${page}"]`);
  if (elm) {
    document.getElementById("navbar").childNodes.forEach((elm) => {
      if (elm.nodeName.toLowerCase() === "li")
        elm.classList.remove(["active"]);
    });
    elm.parentNode.className = "active";
  }
}

/**
 * Navigates to url. Function pushes state into history, changes hash and `document.title`.
 * @param {String} url for example `#dashboard`
 * @returns true if navigation was successful
 */
const navigate = (url) => doNavigate(url, true);

/**
 * Rebuilds DOM but NOT pushes state into
 * history and NOT changes hash.
 *
 * It is currently used for loading screens and pop state.
 * @param {String} url for example `#dashboard`
 * @returns true if navigation was successful
 */
const navigateShallow = (url) => doNavigate(url, false);

export { navigate, navigateShallow };
