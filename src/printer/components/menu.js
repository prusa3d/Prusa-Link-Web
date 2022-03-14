// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

export const initMenu = () => {
  document.getElementById("menu").addEventListener("click", () => {
    isOpen() ? close() : open();
  });

  document.getElementById("navbar").querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("click", close);
  })
};

function isOpen() {
  return document.getElementById("menu").classList.contains("burger-open");
}

function open() {
  document.getElementById("menu").classList.add("burger-open");
  document.getElementById("navbar").classList.remove("burger-menu");
}

function close() {
  document.getElementById("menu").classList.remove("burger-open");
  document.getElementById("navbar").classList.add("burger-menu");
}
