// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import "../../mini-fonts.css";
import * as graph from "../components/temperature_graph";
import Dashboard from "./dashboard.js";
import Temperature from "./temperature.js";
import dashboard from "../../views/dashboard.html";
import temperature from "../../views/temperature.html";
import { updateProperties } from "../components/updateProperties.js";

const context = {
  version: undefined,
  printer: undefined,
};

let currentModule = Dashboard;
const mini = {
  routes: [
    { path: "dashboard", html: dashboard, module: Dashboard },
    { path: "temperature", html: temperature, module: Temperature },
  ],
  init: (version, printerData) => {
    console.log("Init Printer API");
    context.version = version;
    context.printer = printerData;
    initTemperatureGraph();
  },
  update: (data) => {
    console.log("Update Printer API");
    context.printer = data;
    updateProperties("telemetry", data);
    updateTemperatureGraph(data);
    updateModule();
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
  graph.update("temp-line-orange", [now, data.temperature.tool0.actual]);
  graph.render();
};

const updateModule = () => {
  if (currentModule && currentModule.update) currentModule.update(context);
};

export default mini;
