// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const toast_context = document.getElementById("prusa-toast");

export const createToast = (title, message, type) => {
  const template = document.getElementById("toast");
  const element = document.importNode(template.content, true);
  const article = element.querySelector("article");
  article.className = type;
  element.querySelector("p").innerHTML = title;
  element.querySelector(".toast-body").innerHTML = message;
  return article;
};

export function info(title, message, type = "") {
  const article = createToast(title, message, type);
  article.querySelector("span").addEventListener("click", (e) => {
    e.preventDefault();
    article.style.display = "none";
  });

  setTimeout(() => {
    toast_context.removeChild(article);
  }, 10500);
  toast_context.appendChild(article);
}

export function warning(title, message) {
  info(title, message, "warning");
}

export function success(title, message) {
  info(title, message, "success");
}

export function error(title, message) {
  const article = createToast(title, message, "error");
  article.querySelector("span").addEventListener("click", (e) => {
    e.preventDefault();
    toast_context.removeChild(article);
  });

  toast_context.appendChild(article);
}

export default { info, warning, success, error };
