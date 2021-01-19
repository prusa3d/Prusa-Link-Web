{% extends "router.js" %}
{% block header %}
import Dashboard from "./logic/sl1/dashboard.js";
import Projects from "./logic/sl1/projects.js";
import Temperature from "./logic/sl1/temperature.js";
import dashboard from "./views/sl1/dashboard.html";
import projects from "./views/sl1/projects.html";
import temperature from "./views/sl1/temperature.html";

const routes = [
    { path: 'dashboard', html: dashboard, module: Dashboard },
    { path: 'projects', html: projects, module: Projects },
    { path: 'temperature', html: temperature, module: Temperature },
]; 
{% endblock %}