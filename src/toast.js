// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const toast_context = document.getElementById("prusa-toast");

export function info(title, message, type = "") {
  const template = document.getElementById("toast");
  const element = document.importNode(template.content, true);
  const article = element.querySelector("article");
  article.className = type;
  element.querySelector("p").innerHTML = title;
  element.querySelector(".toast-body").innerHTML = message;
  element.querySelector("span").addEventListener("click", (e) => {
    article.style.display = "none";
    e.preventDefault();
    e.stopPropagation();
  });

  toast_context.appendChild(article);
  setTimeout(() => {
    toast_context.removeChild(article);
  }, 10500);
}

export function warning(title, message) {
  info(title, message, "warning");
}

export function error(title, message) {
  info(title, message, "error");
}

export function success(title, message) {
  info(title, message, "success");
}
