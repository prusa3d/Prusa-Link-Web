// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

/** Viewbox width */
const WIDTH = 500;
/** Minimum value on X axis */
const MIN_X = -10;
/** Maximum temperature */
let MAX_TEMP = 100;

/** Maximum step when generating new values in graph */
let MAX_STEP = 15; // For mockup

/** Main map that holds all lines and temperatures. Key = line id, Value = Array with temperature data
 * @type Map<String, Array<Array<number>>
 */
let map = new Map();

/**
 * @param {Map<String, Array<Array<number>>} mp Main map that holds all lines and temperatures. Key = line id, Value = Array with temperature data
 * @param {number} maxTemp Maximum temperature
 * @param {number} maxStep Maximum step when generating new values in graph
 */
export const init = (mp, maxTemp, maxStep) => {
  map = mp;

  MAX_TEMP = maxTemp;
  MAX_STEP = maxStep;
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

// Mockup
export function generateNextTemp(lineId) {
  const temperatures = map.get(lineId);
  const lastTemp = temperatures[temperatures.length - 1][1];
  const nextTemp = generateRandomTemp(lastTemp, 0, MAX_TEMP, MAX_STEP);
  return nextTemp;
}

// Mockup
export function generateRandomTemp(last, min, max, maxStep) {
  if (last === null || last === undefined) last = randomInt(min, max);

  let val = randomInt(-maxStep, maxStep);

  // Have higher chance to move toward center
  if (last > (max - min) * 0.75) {
    val = randomInt(1, 3) == 1 ? Math.abs(val) : -Math.abs(val);
  } else if (last < (max - min) * 0.25) {
    val = randomInt(1, 3) == 1 ? -Math.abs(val) : +Math.abs(val);
  }

  val += last;

  // Clamp
  if (val > max) return max;
  if (val < min) return min;
  return val;
}

// Mockup
export function generateRandomGraph(now, minTemp, maxTemp, maxStep) {
  let graph = [];

  for (let i = 180 * 1000; i > 0; i -= process.env.UPDATE_INTERVAL) {
    graph.push([
      now - i,
      generateRandomTemp(
        graph.length === 0 ? undefined : graph[graph.length - 1][1],
        minTemp,
        maxTemp,
        maxStep
      ),
    ]);
  }

  return graph;
}

// Used for mockup
/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 */
function randomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
