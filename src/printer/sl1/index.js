import Temperature from "./temperature.js";
import temperature from "../../views/sl1/temperature.html";
import Dashboard from "./dashboard.js";
import dashboard from "../../views/sl1/dashboard.html";
import Projects from "./projects.js";
import projects from "../../views/sl1/projects.html";

const sl1 = {
    routes: [
        { path: 'dashboard', html: dashboard, module: Dashboard },
        { path: 'projects', html: projects, module: Projects },
        { path: 'temperature', html: temperature, module: Temperature },
    ],
}

export default sl1;