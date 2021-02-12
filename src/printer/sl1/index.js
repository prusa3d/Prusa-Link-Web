// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import Temperature from "./temperature.js";
import temperature from "../../views/temperature.html";
import Dashboard from "./dashboard.js";
import dashboard from "../../views/dashboard.html";
import Projects from "./projects.js";
import projects from "../../views/projects.html";
import Preview from "./preview.js";
import preview from "../../views/preview.html";
import telemetry from "../components/telemetry";

let currentModule = Dashboard;
const sl1 = {
  routes: [
    { path: "dashboard", html: dashboard, module: Dashboard },
    { path: "projects", html: projects, module: Projects },
    { path: "temperature", html: temperature, module: Temperature },
    { path: "preview", html: preview, module: Preview },
  ],
  init: () => {
    console.log("Init Printer API");
    initTemperatureGraph();
  },
  update: (status, data) => {
    if (status.ok) {
      telemetry(data);
      updateTemperatureGraph(data);
    } else {
      console.log("Error");
      console.log(data);
    }
  },
  setModule: (module) => {
    currentModule = module;
  },
};

const initTemperatureGraph = () => {
  const maxTemp = 100;

  let map = new Map([
    ["temp-line-blue", []],
    ["temp-line-orange", []],
    ["temp-line-yellow", []],
  ]);

  graph.init(map, maxTemp);
  graph.render();
};

const updateTemperatureGraph = (data) => {
  const now = new Date().getTime();
  graph.update("temp-line-blue", [
    now,
    data.temperature.chamber.actual, // Original Prusa SL1 uses Chamber for ambient temp
  ]);
  graph.update("temp-line-orange", [
    now,
    data.temperature.tool0.actual, /* TODO: API collision - Original Prusa SL1 uses
    Extruderfor UV LED temp - current API provides only tool0 */
  ]);
  graph.update("temp-line-yellow", [
    now,
    data.temperature.bed.actual, // Original Prusa SL1 uses Bed for CPU temperature
  ]);
  graph.render();
};

export default sl1;
