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
import Refill from "./refill.js";
import refill from "../../views/refill.html";
import Question from "../components/question.js";
import question from "../../views/question.html";
import busy from "../../views/busy.html";
import Busy from "../components/busy.js";
import { updateProperties } from "../components/updateProperties.js";
import { translate } from "../../locale_provider";
import { states, get_state } from "../components/state";

const context = {
  version: undefined,
  printer: undefined,
  state: undefined,
  last_state: undefined,
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
const sl1 = {
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
      path: "busy",
      html: busy,
      module: updateHostname(Busy),
    },
    { path: "refill", html: refill, module: updateHostname(Refill) },
  ],
  init: (version, printerData) => {
    context.version = version;
    context.printer = printerData;
    context.state = states.IDLE;
    initTemperatureGraph();
  },
  update: (data) => {
    context.printer = data;
    context.last_state = context.state;
    context.state = get_state(data);
    updateProperties("telemetry", data);
    updateTemperatureGraph(data);
    updateModule();
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
    data.temperature.tool0
      .actual /* TODO: API collision - Original Prusa SL1 uses
    Extruderfor UV LED temp - current API provides only tool0 */,
  ]);
  graph.update("temp-line-yellow", [
    now,
    data.temperature.bed.actual, // Original Prusa SL1 uses Bed for CPU temperature
  ]);
  graph.render();
};

const updateModule = () => {
  if (currentModule && currentModule.update) currentModule.update(context);
};

export default sl1;
