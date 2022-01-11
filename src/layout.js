// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

window.addEventListener("load", () => {
  updateTelemetryPosition();
});

window.addEventListener("resize", () => {
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
  const topOffset = 87;

  if (window.innerHeight > (rect.height + topOffset)) {
    elm.style.position = "sticky";
    elm.style.top = `${topOffset}px`;
  } else {
    elm.style.position = "sticky";
    let top = topOffset - window.scrollY;
    const minTop = window.innerHeight - rect.height;
    if (top < minTop)
      top = minTop;
    elm.style.top = `${top}px`;
  }
}