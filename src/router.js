import Dashboard from "./dashboard.js";
import Projects from "./projects.js";
import Temperature from "./temperature.js";
import dashboard from "./templates/dashboard.html";
import projects from "./templates/projects.html";
import temperature from "./templates/temperature.html";

const routes = [
    { path: 'dashboard', html: dashboard, module: Dashboard },
    { path: 'projects', html: projects, module: Projects },
    { path: 'temperature', html: temperature, module: Temperature },
];

const navigate = (url) => {
    const [_, page] = url.split("#");
    if (!page) return false;    
    const route = routes.find(r => r.path === page);
    if (!route) return false;
    const root = document.getElementById("root");
    root.innerHTML = '';
    (new DOMParser()).parseFromString(route.html, "text/html").body.childNodes.forEach(
        n => root.appendChild(n)
    );
    route.module.load();
    return true;
};

export { navigate };