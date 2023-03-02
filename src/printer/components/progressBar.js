// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Update progress.
 * @param {HTMLElement?} root Parent wrapper element.
 * @param {number} progress Current progress from 0 to 1.
 * @param {"top" | "right" | "bottom" | "left"} direction Fill direction.
 * Default is right.
 */
export function updateProgressBar(root, progress, direction = "right") {
  if (!root)
    return;

  const insetFor = (dir) => {
    if (dir === direction)
      return `${100 - progress}%`;
    return 0;
  }

  const fill = root.querySelector(".fill");
  if (fill) {
    // inset will be for example: "0 0 0 50%"
    const inset = `${["top", "right", "bottom", "left"].map(dir => insetFor(dir)).join(" ")}`;
    fill.style.inset = inset;
  }
}
