// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Set element to be visible or not by modifying `hidden` attribute.
 * @param {HTMLElement | null} element
 * @param {boolean} hidden
 */
export function setHidden(element, hidden = true) {
  if (element) {
    if (hidden && !element.hasAttribute("hidden"))
      element.setAttribute("hidden", true);

    if (!hidden && element.hasAttribute("hidden"))
      element.removeAttribute("hidden");
  }
}

/**
 * Set element to be visible or not by modifying `hidden` attribute.
 * @param {HTMLElement | null} element
 * @param {boolean} visible
 */
export function setVisible(element, visible = true) {
  setHidden(element, !visible);
}

/**
 * Set element to be disabled or not by modifying `disabled` attribute.
 * @param {HTMLElement | null} element
 * @param {boolean} disabled
 */
export function setDisabled(element, disabled = true) {
  if (element) {
    if (disabled && !element.hasAttribute("disabled"))
      element.setAttribute("disabled", true);

    if (!disabled && element.hasAttribute("disabled"))
      element.removeAttribute("disabled");
  }
}

/**
 * Set element to be enabled or not by modifying `disabled` attribute.
 * @param {HTMLElement | null} element
 * @param {boolean} enabled
 */
 export function setEnabled(element, enabled = true) {
  return setDisabled(element, !enabled);
}

/**
 * Check if element has `hidden` attribute.
 * @param {HTMLElement | null} elem
 */
export function isHidden(elem) {
  return elem && elem.hasAttribute("hidden");
}

export function showLoading() {
  setVisible(document.querySelector("#job .loading-overlay"));
}

export function hideLoading() {
  setHidden(document.querySelector("#job .loading-overlay"));
}

/**
 * Invoke callback when user clicks outside given element(s).
 * Subscription is removed after callback.
 * @param {() => void} callback
 * @param {...Element} refs References to one or more elements to ignore clicks.
 */
export function onOutsideClick(callback, ...refs) {
  const handler = (e) => {
    if (refs) {
      for (const ref of refs) {
        if (ref && ref.contains(e.target))
          return;
      }
    }
    if (callback) {
      callback();
    }
    window.removeEventListener("pointerup", handler);
  };
  window.addEventListener("pointerup", handler);
}
