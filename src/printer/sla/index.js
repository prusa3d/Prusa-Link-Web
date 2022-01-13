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
import updateConnectionStatus from "../components/updateConnectionStatus";

const context = {
  /** Result of `api/version`. */
  version: undefined,
  /** Result of `api/printer`. */
  printer: undefined,
  /** Result of `api/job`.job */
  current: undefined,
  /** Result of `api/connection`. */
  connection: undefined,
};

const updateHostname = (obj) => {
  const newHostname = () => {
    const hostnameLabel = document.getElementById("title-hostname");
    if (hostnameLabel) {
      hostnameLabel.innerHTML = getHostname();
    }
  };
  const load = obj.load;
  obj.load = () => {
    newHostname();
    load(context);
  };
  return obj;
};

const getHostname = () => context.version?.hostname || "localhost";
const buildTitle = (title) => getHostname() + " - " +
  (title.trim() || process.env.APP_NAME) +
  " - " + process.env.APP_NAME;

const updatePrinterStatus = (state) => {
  if (state) {
    const query = { query: "#printer-status" };
    if (state.flags.error || state.flags.closedOrError)
      translate("ntf.error", query);
    else if (!state.flags.operational)
      translate("prop.st-busy", query);
    else if (state.flags.paused) {
      if (state.text === "Pour in resin")
        translate("prop.st-pour-resin", query);
      else if (state.text === "Feed me")
        translate("prop.st-feedme", query);
      else
        translate("prop.st-paused", query);
    }
    else if (state.flags.printing)
      translate("prop.st-printing", query);
    else
      translate("prop.st-idle", query);
  }
};

let currentModule = dashboard;
const sla = {
  routes: [
    {
      path: "dashboard",
      html: require("../../views/dashboard.html"),
      module: updateHostname(dashboard),
      getTitle: () => buildTitle(translate("home.link")),
    },
    {
      path: "temperature",
      html: require("../../views/temperature.html"),
      module: updateHostname(temperature),
      getTitle: () => buildTitle(translate("temps.title")),
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
    process.env.WITH_PROJECTS ?
      {
        path: "projects",
        html: require("../../views/projects.html"),
        module: updateHostname(projects),
        getTitle: () => buildTitle(translate("proj.link")),
      }
      : null,
    process.env.WITH_SETTINGS ?
      {
        path: "settings",
        html: require("../../views/settings.html"),
        module: updateHostname(require("../components/settings.js").default),
        getTitle: () => buildTitle(translate("settings.title")),
      }
      : null,
    process.env.WITH_CONTROLS ?
      {
        path: "control",
        html: require("../../views/control.html"),
        module: updateHostname(require("../components/control.js").default),
        getTitle: () => buildTitle(translate("control.link")),
      } : null,
  ].filter(route => route != null),
  init: ({ version, printer, connection }) => {
    context.version = version;
    context.printer = printer?.data;
    context.connection = connection?.data;
    document.title = version.hostname + " - " + process.env.APP_NAME;
    initTemperatureGraph();
  },
  update: ({ printer, job, connection }) => {
    context.printer = printer?.data;
    context.current = job?.data;
    context.connection = connection?.data || context.connection;
    if (context.printer.state.flags.operational)
      hideLoading();
    else
      showLoading();
    updateProperties("telemetry", context.printer);
    updatePrinterStatus(context.printer.state);
    updateTemperatureGraph(context.printer);
    updateModule();
  },
  setConnected: (isConnected) => {
    updateConnectionStatus({
      connection: context.connection,
      isConnected,
    });
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
