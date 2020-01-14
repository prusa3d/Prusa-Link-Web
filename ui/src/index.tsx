import { h, render, createContext } from "preact";
import "./style/index.scss";
import App from "./components/app";

export const Config = createContext({});
export default App;

const config = {
    apiKey: "developer",
    printer: "prusa-sl1",
    update_timer: 2000
}

render(
    <Config.Provider value={config}>
        < App config={config} />
    </Config.Provider>, document.body);