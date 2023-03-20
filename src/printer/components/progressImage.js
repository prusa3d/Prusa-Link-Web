// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Render (mount) progress image.
 * @param {HTMLElement} root Parent wrapper element.
 * @param {string} src Img source url.
 * @param {number} progress Initial progress.
 */
export function renderProgressImg(root, thumbnail, progress) {
  if (!root)
    return;

  const src = thumbnail?.url && thumbnail.ready
    ? thumbnail.url
    : document.querySelector('.thumbnail-fallback')?.src;

  const currentThumbnailSrc = root.getAttribute("data-src");

  if (currentThumbnailSrc !== src) {
    while (root.firstChild) {
      root.removeChild(root.firstChild)
    }

    root.setAttribute("data-src", src);

    const wrapper = document.createElement("div");
    wrapper.className = "progress-img";

    const background = document.createElement("img");
    background.src = src;
    background.className = "background";
    wrapper.appendChild(background);

    const foreground = document.createElement("img");
    foreground.src = src;
    foreground.className = "foreground";
    foreground.style.clipPath = progressToClipPath(progress ?? 100);
    wrapper.appendChild(foreground);

    root.appendChild(wrapper);
  } else {
    const foreground = root.querySelector(".foreground");
    if (foreground) {
      foreground.style.clipPath = progressToClipPath(progress);
    }
  }
}

/**
 * Update progress.
 * @param {HTMLElement?} root Parent wrapper element.
 * @param {number} progress Current progress.
 */
export function updateProgressImg(root, progress) {
  if (!root)
    return;

  const foreground = root.querySelector(".foreground");
  if (foreground) {
    foreground.style.clipPath = progressToClipPath(progress);
  }
}

function progressToClipPath(progress) {
  return `inset(${100 - progress}% 0% 0% 0%)`;
}
