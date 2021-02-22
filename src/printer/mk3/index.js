// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import Temperature from "./temperature.js";
import temperature from "../../views/temperature.html";
import Dashboard from "./dashboard.js";
import dashboard from "../../views/dashboard.html";
import Projects from "../components/projects.js";
import projects from "../../views/projects.html";
import Preview from "../components/preview.js";
import preview from "../../views/preview.html";
import Job from "../components/job.js";
import job from "../../views/job.html";
import Question from "../components/question.js";
import question from "../../views/question.html";
import loading from "../../views/loading.html";
import { updateProperties } from "../components/updateProperties.js";
import { errorFormat } from "../components/errors";

const context = {
  version: undefined,
  printer: undefined,
};

let currentModule = Dashboard;
const mk3 = {
  routes: [
    { path: "dashboard", html: dashboard, module: Dashboard },
    { path: "projects", html: projects, module: Projects },
    { path: "temperature", html: temperature, module: Temperature },
    { path: "preview", html: preview, module: Preview },
    { path: "job", html: job, module: Job },
    { path: "question", html: question, module: Question },
    { path: "loading", html: loading, module: { load: () => {} } },
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
  document.getElementById("title-hostname").innerHTML =
    context.version.hostname;
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

export default mk3;
