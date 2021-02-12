// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import Dashboard from "./dashboard.js";
import Temperature from "./temperature.js";
import dashboard from "../../views/dashboard.html";
import temperature from "../../views/temperature.html";
import telemetry from "../components/telemetry";

let currentModule = Dashboard;
const mini = {
  routes: [
    { path: "dashboard", html: dashboard, module: Dashboard },
    { path: "temperature", html: temperature, module: Temperature },
  ],
  init: () => {
    console.log("Init Printer API");
    initTemperatureGraph();
  },
  update: (status, data) => {
    console.log("Update Printer API");
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
  const maxTemp = 300;

  let map = new Map([
    ["temp-line-blue", []],
    ["temp-line-orange", []],
  ]);

  graph.init(map, maxTemp);
  graph.render();
};

const updateTemperatureGraph = (data) => {
  const now = new Date().getTime();
  graph.update("temp-line-blue", [now, data.temperature.bed.actual]);
  graph.update("temp-line-orange", [now, data.temperature.chamber.actual]);
  graph.render();
};

export default mini;
