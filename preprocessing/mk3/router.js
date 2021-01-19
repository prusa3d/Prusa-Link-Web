{% extends "router.js" %}
{% block header %}
// same as mini
import Temperature from "./logic/mini/temperature.js";
import temperature from "./views/mini/temperature.html";

import Dashboard from "./logic/mk3/dashboard.js";
import Projects from "./logic/mk3/projects.js";
import dashboard from "./views/mk3/dashboard.html";
import projects from "./views/mk3/projects.html";


const routes = [
    { path: 'dashboard', html: dashboard, module: Dashboard },
    { path: 'projects', html: projects, module: Projects },
    { path: 'temperature', html: temperature, module: Temperature },
];
{% endblock %}