// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import dashboard from "./dashboard.js";
import projects from "../components/projects";
import question from "../components/question.js";
import temperature from "./temperature.js";
import { updateProperties } from "../components/updateProperties.js";
import { translate } from "../../locale_provider";
import updateConnectionStatus from "../components/updateConnectionStatus";

const context = {
  /** Result of `api/version`. */
  version: undefined,
  /** Result of `api/printer`. */
  printer: undefined,
  /** Result of `api/job`.job. */
  current: undefined,
  /** Result of `api/connection`. */
  connection: undefined,
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

const updatePrinterStatus = (state) => {
  const query = { query: "#printer-status" };
  if (state) {
    if (state.flags.printing && !state.flags.ready) {
      if (state.flags.paused) {
        translate("prop.st-paused", query);
      } else {
        translate("prop.st-printing", query);
      }
      return;
    }
  }
  translate("prop.st-idle", query);
};

let currentModule = dashboard;
const fdm = {
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

export default fdm;
