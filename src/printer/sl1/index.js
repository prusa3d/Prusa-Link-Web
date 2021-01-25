// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import Temperature from "./temperature.js";
import temperature from "../../views/temperature.html";
import Dashboard from "./dashboard.js";
import dashboard from "../../views/dashboard.html";
import Projects from "./projects.js";
import projects from "../../views/projects.html";
import Modal from "../../modal.js"

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
            Modal.load("welcome", {cb: ()=>{
                window.localStorage.setItem("showWelcome", true);
            } });
        }
    },
    update: () => {
        console.log("Update Printer API")
    }
}

export default sl1;