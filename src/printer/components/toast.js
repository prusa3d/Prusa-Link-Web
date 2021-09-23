// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const toast_context = document.getElementById("prusa-toast");

/**
 * Create a toast element
 * @param {string} title
 * @param {string} message
 * @param {string} type
 */
export const createToast = (title, message, type) => {
  const template = document.getElementById("toast");
  const element = document.importNode(template.content, true);
  const article = element.querySelector("article");
  article.className = type;
  element.querySelector("p").innerHTML = title;
  element.querySelector(".toast-body").innerHTML = message;
  return article;
};

/**
 * Create and show a info toast
 * @param {string} title
 * @param {string} message
 */
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

/**
 * Create and show a warning toast
 * @param {string} title
 * @param {string} message
 */
export function warning(title, message) {
  info(title, message, "warning");
}

/**
 * Create and show a success toast
 * @param {string} title
 * @param {string} message
 */
export function success(title, message) {
  info(title, message, "success");
}

/**
 * Create and show a error toast
 * @param {string} title
 * @param {string} message
 */
export function error(title, message) {
  const article = createToast(title, message, "error");
  article.querySelector("span").addEventListener("click", (e) => {
    e.preventDefault();
    toast_context.removeChild(article);
  });

  toast_context.appendChild(article);
}

export default { info, warning, success, error };
