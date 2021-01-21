import Temperature from "../mini/temperature.js";
import temperature from "../../views/temperature.html";
import Dashboard from "./dashboard.js";
import dashboard from "../../views/dashboard.html";
import Projects from "./projects.js";
import projects from "../../views/projects.html";

const mk3 = {
    routes: [
        { path: 'dashboard', html: dashboard, module: Dashboard },
        { path: 'projects', html: projects, module: Projects },
        { path: 'temperature', html: temperature, module: Temperature },
    ],
}

export default mk3;