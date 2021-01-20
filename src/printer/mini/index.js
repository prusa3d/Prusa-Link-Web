import Dashboard from "./dashboard.js";
import Temperature from "./temperature.js";
import dashboard from "../../views/mini/dashboard.html";
import temperature from "../../views/mini/temperature.html";

const mini = {
    routes: [
        { path: 'dashboard', html: dashboard, module: Dashboard },
        { path: 'temperature', html: temperature, module: Temperature },
    ],
}

export default mini;