import Temperature from "../mini/temperature.js";
import temperature from "../../views/mini/temperature.html";
import Dashboard from "./dashboard.js";
import dashboard from "../../views/mk3/dashboard.html";
import Projects from "./projects.js";
import projects from "../../views/mk3/projects.html";

const mk3 = {
    routes: [
        { path: 'dashboard', html: dashboard, module: Dashboard },
        { path: 'projects', html: projects, module: Projects },
        { path: 'temperature', html: temperature, module: Temperature },
    ],
}

export default mk3;