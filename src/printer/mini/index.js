// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import Dashboard from "./dashboard.js";
import Temperature from "./temperature.js";
import dashboard from "../../views/dashboard.html";
import temperature from "../../views/temperature.html";

const mini = {
    routes: [
        { path: 'dashboard', html: dashboard, module: Dashboard },
        { path: 'temperature', html: temperature, module: Temperature },
    ],
    init: () => {
        console.log("Init Printer API");
    },
    update: () => {
        console.log("Update Printer API")
    }
}

export default mini;