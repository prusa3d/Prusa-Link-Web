// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import dashboard from "./dashboard.js";
import projects from "../components/projects";
import question from "../components/question.js";
import refill from "./refill.js";
import temperature from "./temperature.js";
import { updateProperties } from "../components/updateProperties.js";
import { translate } from "../../locale_provider";
import { showLoading, hideLoading } from "../../helpers/element";

const context = {
  /** Result of `api/version`. */
  version: undefined,
  /** Result of `api/printer`. */
  printer: undefined,
  /** Result of `api/job`.job */
  current: undefined,
};

const updateHostname = (obj) => {
  const newHostname = () => {
    const hostnameLabel = document.getElementById("title-hostname");
    if (hostnameLabel) {
      hostnameLabel.innerHTML = translate("glob.hostname") + ":";
      document.getElementById("title-hostname").innerHTML =
        context.version?.hostname || "localhost";
    }
  };
  const load = obj.load;
  obj.load = () => {
    newHostname();
    load(context);
  };
  return obj;
};

let currentModule = dashboard;
const sla = {
  routes: [
    {
      path: "dashboard",
      html: require("../../views/dashboard.html"),
      module: updateHostname(dashboard),
    },
    {
      path: "projects",
      html: require("../../views/projects.html"),
      module: updateHostname(projects),
    },
    {
      path: "temperature",
      html: require("../../views/temperature.html"),
      module: updateHostname(temperature),
    },
    {
      path: "question",
      html: require("../../views/question.html"),
      module: updateHostname(question),
    },
    {
      path: "loading",
      html: require("../../views/loading.html"),
      module: updateHostname({
        load: () => translate("proj.title", { query: "#title-status-label" }),
      }),
    },
    {
      path: "refill",
      html: require("../../views/refill.html"),
      module: updateHostname(refill),
    },
    process.env.WITH_SETTINGS ?
      {
        path: "settings",
        html: require("../../views/settings.html"),
        module: updateHostname(require("../components/settings.js").default),
      }
      : null,
    process.env.WITH_CONTROLS ?
      {
        path: "control",
        html: require("../../views/control.html"),
        module: updateHostname(require("../components/control.js").default),
      } : null,
  ].filter(route => route != null),
  init: (version, printerData) => {
    context.version = version;
    context.printer = printerData;
    initTemperatureGraph();
  },
  update: (printerData, jobData) => {
    context.printer = printerData;
    context.current = jobData;
    if (printerData.state.flags.operational)
      hideLoading();
    else
      showLoading();
    updateProperties("telemetry", printerData);
    updateTemperatureGraph(printerData);
    updateModule();
  },
  setModule: (module) => {
    currentModule = module;
  },
  getContext: () => {
    return context;
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

export default sla;
