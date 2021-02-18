// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import formatData from "./dataFormat.js";

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

export const updateProperties = (type, data) => {
  document.querySelectorAll(`[data-type="${type}"]`).forEach((elm) => {
    elm.innerHTML = formatData(
      elm.dataset.format,
      getValue(elm.dataset.where, data)
    );
  });
};

export const updateLayers = (id, data) => {
  const elm = document.getElementById(id);
  const current = getValue(elm.dataset.where, data) || 0;
  const total = getValue(elm.dataset.whereTotal, data) || 0;
  elm.innerHTML = `${current}/${total}`;
};

export default updateProperties;
