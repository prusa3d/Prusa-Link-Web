// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import getElement from "../../helpers/get_element";

export const initKebabMenu = (root) => {
  const element = getElement(root);
  const kebab = element.querySelector(".kebab");
  const btn = kebab.querySelector(".kebab-menu");
  const ul = kebab.querySelector("ul");

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    isOpen(ul) ? close(ul) : open(ul);
  });

  ul.querySelectorAll("li").forEach((li) => {
    li.addEventListener("click", () => close(ul));
  })
};

function isOpen(ul) {
  return ul && ul.classList.contains("open");
}

function open(ul) {
  ul.classList.add("open");
  onOutsideClick(ul, () => close(ul));
}

function close(ul) {
  ul.classList.remove("open");
}

function onOutsideClick(ref, callback) {
  const handler = (e) => {
    if (ref && ref.contains(e.target))
      return;
    if (ref)
      callback();
    window.removeEventListener("pointerup", handler);
  };
  window.addEventListener("pointerup", handler);
}
