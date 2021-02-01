// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import Dashboard from "./dashboard.js";
import Temperature from "./temperature.js";
import dashboard from "../../views/dashboard.html";
import temperature from "../../views/temperature.html";

const mini = {
  routes: [
    { path: "dashboard", html: dashboard, module: Dashboard },
    { path: "temperature", html: temperature, module: Temperature },
  ],
  init: () => {
    console.log("Init Printer API");
    initTemperatureGraph();
  },
  update: () => {
    console.log("Update Printer API");
    updateTemperatureGraph();
  },
};

const initTemperatureGraph = () => {
  const maxStep = 15;
  const maxTemp = 300;
  const now = new Date().getTime();

  let map = new Map([
    ["temp-line-blue", graph.generateRandomGraph(now, 0, maxTemp, maxStep)],
    ["temp-line-orange", graph.generateRandomGraph(now, 0, maxTemp, maxStep)],
  ]);

  graph.init(map, maxTemp, maxStep);
  graph.render();
};

const updateTemperatureGraph = () => {
  const now = new Date().getTime();
  graph.update("temp-line-blue", [
    now,
    graph.generateNextTemp("temp-line-blue"),
  ]);
  graph.update("temp-line-orange", [
    now,
    graph.generateNextTemp("temp-line-orange"),
  ]);
  graph.render();
};

export default mini;
