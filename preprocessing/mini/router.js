{% extends "router.js" %}
{% block header %}
import Dashboard from "./logic/mini/dashboard.js";
import Temperature from "./logic/mini/temperature.js";
import dashboard from "./views/mini/dashboard.html";
import temperature from "./views/mini/temperature.html";

const routes = [
    { path: 'dashboard', html: dashboard, module: Dashboard },
    { path: 'temperature', html: temperature, module: Temperature },
];
{% endblock %}