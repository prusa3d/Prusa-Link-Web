// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Returns nested value from given object. Something like "obj[nodes][for][specific][key]"
 * @param object Object to get value from.
 * @param {String} path Path to key. For example "nodes.for.specific.key"
 */

// module.exports format is due to compatibility with webpack loader

module.exports = function (object, path) {
  let keys = path.split(".");
  let obj = object;
  for (const key of keys) {
    obj = obj[key];
    if (!obj) break;
  }
  return obj;
};
