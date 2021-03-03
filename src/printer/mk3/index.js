// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import "../../fonts.css";
import * as graph from "../components/temperature_graph";
import Temperature from "./temperature.js";
import temperature from "../../views/temperature.html";
import Dashboard from "./dashboard.js";
import dashboard from "../../views/dashboard.html";
import Projects from "../components/projects.js";
import projects from "../../views/projects.html";
import Preview from "../components/preview.js";
import preview from "../../views/preview.html";
import Job from "./job.js";
import job from "../../views/job.html";
import Question from "../components/question.js";
import question from "../../views/question.html";
import loading from "../../views/loading.html";
import { updateProperties } from "../components/updateProperties.js";
import { translate } from "../../locale_provider";
import { translateTelemetry } from "./translate";

const context = {
  version: undefined,
  printer: undefined,
};

const updateHostname = (obj) => {
  const newHostname = () => {
    const hostnameLabel = document.getElementById("title-hostname-label");
    if (hostnameLabel) {
      hostnameLabel.innerHTML = translate("glob.hostname") + ":";
      document.getElementById("title-hostname").innerHTML =
        context.version.hostname;
    }
  };
  const load = obj.load;
  obj.load = () => {
    newHostname();
    load();
  };
  return obj;
};

let currentModule = Dashboard;
const mk3 = {
  routes: [
    { path: "dashboard", html: dashboard, module: updateHostname(Dashboard) },
    { path: "projects", html: projects, module: updateHostname(Projects) },
    {
      path: "temperature",
      html: temperature,
      module: updateHostname(Temperature),
    },
    { path: "preview", html: preview, module: updateHostname(Preview) },
    { path: "job", html: job, module: updateHostname(Job) },
    { path: "question", html: question, module: updateHostname(Question) },
    {
      path: "loading",
      html: loading,
      module: updateHostname({
        load: () => translate("proj.title", { query: "#title-status-label" }),
      }),
    },
  ],
  init: (version, printerData) => {
    console.log("Init Printer API");
    context.version = version;
    context.printer = printerData;
    initTemperatureGraph();
    translateTelemetry();
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

export default mk3;
