// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import formatData from "./dataFormat.js";

/**
 * extract a value from the data object based in the location
 * @param {string} location
 * @param {object} data
 */
export const getValue = (location, data) => {
  try {
    const where = location.split(".");
    let value = data;
    while (where.length) {
      value = value[where.shift()];
    }
    return value;
  } catch (e) {
    return undefined;
  }
};

/**
 * Search and update all properties with the same type from the object data.
 * @param {string} type
 * @param {object} data
 */
export const updateProperties = (type, data) => {
  document.querySelectorAll(`[data-type="${type}"]`).forEach((elm) => {
    const where = elm.dataset.where;
    const value = where ? getValue(where, data) : data;
    elm.innerHTML = formatData(elm.dataset.format, value);
  });
};

export default updateProperties;
