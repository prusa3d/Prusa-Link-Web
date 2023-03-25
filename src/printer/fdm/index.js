// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import dashboard from "./dashboard.js";
import files from "../components/files";
import question from "../components/question.js";
import { buildTitle, getPrinterLabel, getStatusForTitle } from "../common.js";
import { updateProperties } from "../components/updateProperties.js";
import { translate } from "../../locale_provider";
import { LinkState, translateState } from "../../state";
import updateConnectionStatus from "../components/updateConnectionStatus";
import { currentRoute } from "../../router";

const context = {
  /** Result of `api/version`. */
  version: undefined,
  /** Result of `api/printer`. */
  printer: undefined,
  /** Result of `api/job`.job. */
  current: undefined,
  /** Result of `api/connection`. */
  connection: undefined,
  /** Supported file extensions. */
  fileExtensions: [],
};

const updatePrinterTitle = (obj) => {
  const newTitle = () => {
    const label = document.getElementById("title-printer");
    if (label) {
      label.innerHTML = getPrinterName();
    }
  };
  const load = obj.load;
  obj.load = () => {
    newTitle();
    load(context);
  };
  return obj;
};

const getPrinterName = () => getPrinterLabel(context);

const updatePrinterStatus = (state) => {
  const linkState = LinkState.fromApi(state);
  const elem = document.getElementById("printer-status");
  if (elem) {
    elem.innerHTML = translateState(linkState);
  }
};

const buildRouteTitle = (titleItems) => buildTitle([
  ...titleItems,
  getPrinterName(),
  process.env["APP_NAME"]
]);

let currentModule = dashboard;
const fdm = {
  routes: [
    {
      path: "dashboard",
      html: require("../../views/dashboard.html"),
      module: updatePrinterTitle(dashboard),
      getTitle: () => translate("home.link"),
    },
    {
      path: "question",
      html: require("../../views/question.html"),
      module: updatePrinterTitle(question),
    },
    process.env.WITH_FILES ?
      {
        path: "files",
        html: require("../../views/files.html"),
        module: updatePrinterTitle(files),
        getTitle: () => translate("proj.storage"),
      }
      : null,
    process.env.WITH_SETTINGS ?
      {
        path: "settings",
        html: require("../../views/settings.html"),
        module: updatePrinterTitle(require("../components/settings.js").default),
        getTitle: () => translate("settings.title"),
      }
      : null,
    process.env.WITH_CONTROLS ?
      {
        path: "control",
        html: require("../../views/control.html"),
        module: updatePrinterTitle(require("../components/control.js").default),
        getTitle: () => translate("control.link"),
      } : null,
    process.env.WITH_CAMERAS ?
      {
        path: "cameras",
        html: require("../../views/cameras.html"),
        module: updatePrinterTitle(require("../components/cameras.js").default),
        getTitle: () => translate("cameras.link"),
      } : null,
  ].filter(route => route != null),
  init: (apiResult) => {
    updateContext(apiResult);
    context.fileExtensions = process.env.FILE_EXTENSIONS;
    initTemperatureGraph();
  },
  update: (apiResult) => {
    const page = currentRoute();
    const stateText = getStatusForTitle(context);
    document.title = buildRouteTitle([
      stateText,
      fdm.routes.find(route => route.path === page).getTitle()
    ]);

    updateContext(apiResult);
    updateProperties("telemetry", {...context.printer, version: context.version});
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

const updateContext = ({ connection, job, printer, version }) => {
  if (connection?.ok && connection.payload) {
    context.connection = connection.payload.data;
  }
  if (job?.ok && job.payload) {
    context.current = job.payload.data;
  }
  if (printer?.ok && printer.payload) {
    context.printer = printer.payload.data;
  }
  if (version?.ok && version.payload) {
    context.version = version.payload;
  }
}

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
