// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import * as graph from "../components/temperature_graph";
import Temperature from "./temperature.js";
import temperature from "../../views/temperature.html";
import Dashboard from "./dashboard.js";
import dashboard from "../../views/dashboard.html";
import Projects from "./projects.js";
import projects from "../../views/projects.html";
import { modal } from "../../modal.js";
import { setUpAuth } from "../../auth.js";

const sl1 = {
    routes: [
        { path: 'dashboard', html: dashboard, module: Dashboard },
        { path: 'projects', html: projects, module: Projects },
        { path: 'temperature', html: temperature, module: Temperature },
    ],
    init: () => {
      console.log("Init Printer API");
	  const showWelcome = window.localStorage.getItem("showWelcome");
	  if (showWelcome == null) {
	    modal("welcome", {
	      closeCallback: () => {
	        window.localStorage.setItem("showWelcome", true);
	        setUpAuth();
	      },
	    });
	  } else {
	    setUpAuth();
	  }
      initTemperatureGraph();
    },
    update: () => {
        console.log("Update Printer API")
        updateTemperatureGraph();
    }
}

const initTemperatureGraph = () => {
    const maxStep = 5;
    const maxTemp = 100;
    const now = new Date().getTime();

    let map = new Map([
        ['temp-line-blue', graph.generateRandomGraph(now, 0, maxTemp, maxStep)],
        ['temp-line-orange', graph.generateRandomGraph(now, 0, maxTemp, maxStep)],
        ['temp-line-yellow', graph.generateRandomGraph(now, 0, maxTemp, maxStep)],
    ]);

    graph.init(map, maxTemp, maxStep);
    graph.render();
}

const updateTemperatureGraph = () => {
    const now = new Date().getTime();
    graph.update('temp-line-blue', [now, graph.generateNextTemp('temp-line-blue')]);
    graph.update('temp-line-orange', [now, graph.generateNextTemp('temp-line-orange')]);
    graph.update('temp-line-yellow', [now, graph.generateNextTemp('temp-line-yellow')]);
    graph.render();
}

export default sl1;
