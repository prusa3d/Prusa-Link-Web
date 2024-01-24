// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const toast_context = document.getElementById("prusa-toast");
const timeouts = {
  "info": 10_500,
  "success": 10_500,
  "warning": 10_500,
  "error": 10_500,
};

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
 * Create and show toast
 * @param {{
 *  title: string,
 *  message: string,
 *  type: "info" | "success" | "warning" | "error",
 *  onClose: () => void,
 * }}
 */
function show({ title, message, type, onClose }) {
  const article = createToast(title, message, type);
  const close = () => {
    if (toast_context.contains(article)) {
      toast_context.removeChild(article);
    }
    onClose?.();
  };

  article.querySelector("span").addEventListener("click", (e) => {
    e.preventDefault();
    close();
  });

  const timeout = timeouts[type];
  if (timeout)
    setTimeout(close, timeout);

  toast_context.appendChild(article);
}

/**
 * Create and show a info toast
 * @param {string} title
 * @param {string} message
 * @param {() => void | undefined} onClose
 */
export function info(title, message, onClose) {
  show({ type: "info", title, message, onClose });
}

/**
 * Create and show a warning toast
 * @param {string} title
 * @param {string} message
 * @param {() => void | undefined} onClose
 */
export function warning(title, message, onClose) {
  show({ type: "warning", title, message, onClose });
}

/**
 * Create and show a success toast
 * @param {string} title
 * @param {string} message
 * @param {() => void | undefined} onClose
 */
export function success(title, message, onClose) {
  show({ type: "success", title, message, onClose });
}

/**
 * Create and show a error toast
 * @param {string} title
 * @param {string} message
 * @param {() => void | undefined} onClose
 */
export function error(title, message, onClose) {
  show({ type: "error", title, message, onClose });
}

export default { info, warning, success, error };
