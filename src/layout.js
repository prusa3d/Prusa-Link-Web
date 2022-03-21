// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

window.addEventListener("load", () => {
  updateTelemetryVisibility();
  updateTelemetryPosition();
});

window.addEventListener("resize", () => {
  updateTelemetryVisibility();
  updateTelemetryPosition();
});

window.addEventListener("scroll", () => {
  updateTelemetryPosition();
})

const updateTelemetryPosition = () => {
  const elm = document.querySelector("#telemetry-wrapper > div");
  if (!elm)
    return;

  if (window.innerWidth < 992) {
    if (elm.hasAttribute("style"))
      elm.removeAttribute("style");
    return;
  }

  const rect = elm.getBoundingClientRect();

  if (window.innerHeight > (rect.height + rect.top)) {
    elm.style.position = "sticky";
    elm.style.top = `${rect.top}px`;
  } else {
    elm.style.position = "sticky";
    let top = rect.top - window.scrollY;
    const minTop = window.innerHeight - rect.height;
    if (top < minTop)
      top = minTop;
    elm.style.top = `${top}px`;
  }
}

export const updateTelemetryVisibility = () => {
  const elm = document.querySelector("#telemetry-wrapper");
  if (!elm)
    return;
  const page = window.location.hash;
  if (page === "#dashboard" || window.innerWidth >= 992) {
    if (elm.hasAttribute("style"))
      elm.removeAttribute("style");
  } else {
    elm.setAttribute("style", "display: none;")
  }
}
