// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Function that scrolls to the HTML element if the element is not in the viewport.
 * @param {HTMLElement} target Target element.
 * @param {ScrollBehavior} behavior Scroll behaviour, default is "smooth".
 */
function scrollIntoViewIfNeeded(target, behavior = "smooth") {
  if (!target)
    return;

  const elemRect = target.getBoundingClientRect();
  const bodyRect = document.body.getBoundingClientRect();
  const offset = elemRect.top - (bodyRect.top + getHeaderOffset());

  if (elemRect.bottom > window.innerHeight) {
    window.scroll({ top: offset, behavior });
  } else if (elemRect.top < 0) {
    window.scroll({ top: offset, behavior });
  }
}

function getHeaderOffset() {
  const header = document.querySelector(".header");
  return header && getComputedStyle(header).position === "sticky"
    ? header.getBoundingClientRect().height
    : 0;
}

export default scrollIntoViewIfNeeded;
