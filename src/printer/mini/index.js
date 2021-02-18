// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import Dashboard from "./dashboard.js";
import Temperature from "./temperature.js";
import dashboard from "../../views/dashboard.html";
import temperature from "../../views/temperature.html";
import { updateProperties } from "../components/updateProperties.js";
import { errorFormat } from "../components/errors.js";

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
  update: (status, data) => {
    console.log("Update Printer API");
    if (status.ok) {
      context.printer = data;
      updateProperties("telemetry", data);
      updateTemperatureGraph(data);
      updateModule();
    } else {
      errorFormat(data);
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

const updateModule = () => {
  if (currentModule && currentModule.update) currentModule.update(context);
};

export const updateTitles = () => {
  if (
    context.printer.state.flags.printing &&
    !context.printer.state.flags.ready
  ) {
    document.getElementById("title-status").innerText = "Printing";
    return true;
  } else {
    document.getElementById("title-status").innerText = "Idle";
    return false;
  }
};

export default mini;
