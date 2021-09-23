// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Join path using "/" separator
 * @param  {...string | string[]} segments
 * @returns {string} path
 */
function joinPaths(...segments) {

  // Segments can be string or arrays, we need to split arrays first.
  let splitted = [];
  segments.forEach(segment => {
    if (Array.isArray(segment)) {
      splitted.push(...segment);
    } else if (segment) {
      splitted.push(segment);
    }
  });

  // Build path
  return splitted.map(str => {
    if (str[0] === '/') {
      str = str.substring(1);
    }
    if (str[str.length - 1] === "/") {
      str = str.substring(0, str.length - 1);
    }
    return str;
  }).filter(str => str !== "").join("/");
}

module.exports = {
  joinPaths,
};