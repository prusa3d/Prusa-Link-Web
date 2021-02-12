// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

/** Viewbox width */
const WIDTH = 500;
/** Minimum value on X axis */
const MIN_X = -10;
/** Maximum temperature */
let MAX_TEMP = 100;

/** Main map that holds all lines and temperatures.Key = line id, Value = Array
 * with temperature data
 * @type Map<String, Array<Array<number>>
 */
let map = new Map();

/**
 * @param {Map<String, Array<Array<number>>} mp Main map that holds all lines and
 * temperatures. Key = line id, Value = Array with temperature data
 * @param {number} maxTemp Maximum temperature
 */
export const init = (mp, maxTemp) => {
  map = mp;
  MAX_TEMP = maxTemp;
};

function mount() {
  const template = document.getElementById("graph-template");
  const node = document.importNode(template.content, true);
  document.getElementById("graph").appendChild(node);
}

export function render() {
  const graph = document.getElementById("graph");

  if (!graph) return;

  if (graph.childElementCount == 0) mount();

  map.forEach((temperatures, lineId) => {
    renderTempLine(temperatures, document.getElementById(lineId));
  });
}

/**
 * @param {number[][]} temperatures Temperatures data
 * @param {HTMLElement} path Line element in HTML
 */
function renderTempLine(temperatures, path) {
  const now = new Date().getTime();
  let temp_lines = [];

  if (temperatures.length > 1) {
    let xy = temperatures[0];
    let x = WIDTH - (2.66 * (now - xy[0] + MIN_X * 1000)) / 1000;

    for (let i = 1; i < xy.length; i++)
      temp_lines.push(`M${x},${250 - (2 * xy[i]) / (MAX_TEMP / 100)}`);

    for (let i = 1; i < temperatures.length; i++) {
      xy = temperatures[i];
      x = WIDTH - (2.66 * (now - xy[0] + MIN_X * 1000)) / 1000;

      for (let i = 0; i < temp_lines.length; i++)
        temp_lines[i] =
          temp_lines[i] + `L${x},${250 - (2 * xy[i + 1]) / (MAX_TEMP / 100)}`;
    }
  }

  path.setAttribute("d", temp_lines);
}

/** Push next temperatures to graph
 * @param {string} lineId
 * @param {number[]} nextTemperatures
 */
export function update(lineId, nextTemperatures) {
  updateTemperatures(map.get(lineId), nextTemperatures);
}

export function updateTemperatures(temps, data) {
  temps.push(data);

  // Remove old values - keep one value outside to have smoother end
  const now = new Date().getTime();
  while (temps.length > 1 && temps[1][0] < now - 180 * 1000) temps.shift();
}
