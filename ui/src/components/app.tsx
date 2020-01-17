import { h, Component } from "preact";
import { Router, RouterOnChangeArgs } from "preact-router";

import Home from "../routes/home";
import Project from "../routes/project";
import Header from "./header";
import StatusLeftBoard from "./status-left";

interface temperaturesPoint {
    x: Date;
    y: number;
}

export interface S {
    temp_led: temperaturesPoint[];
    temp_amb: temperaturesPoint[];
    temp_cpu: temperaturesPoint[];
    lock: number;
}

export interface histUpdate {
    updateTempHistory(temperatures: { temp_led: number, temp_amb: number, temp_cpu: number }): void;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class App extends Component<{}, S> implements histUpdate {

    constructor() {
        super();
        this.state = {
            temp_led: [],
            temp_amb: [],
            temp_cpu: [],
            lock: 0
        };
    }

    updateTempHistory = async (temperatures) => {


        const now = new Date().getTime();
        let newState = {};
        const isOlder = (dt) => now - dt.x > 180000; // 3min

        for (let temp of Object.keys(temperatures)) {

            let new_temp = this.state[temp].concat([{ x: now, y: temperatures[temp] }])
            let minOlder = new_temp.findIndex(isOlder);
            if (minOlder > -1) {
                let maxOlder = new_temp.findIndex(e => !isOlder(e));
                new_temp.splice(0, maxOlder);
            }

            newState[temp] = new_temp;

        }

        this.setState(newState);

    }

    render() {

        let currentUrl: string;
        const handleRoute = (e: RouterOnChangeArgs) => {
            currentUrl = e.url;
        };

        return (
            <section id="app" class="section">
                <div class="columns is-vcentered  is-centered">
                    <div class="column is-three-quarters">
                        <Header />
                    </div>
                </div>
                <div class="columns is-centered">
                    <div class="column is-three-quarters">
                        <div class="columns is-centered">
                            <div class="column">
                                <StatusLeftBoard updateTempHistory={this.updateTempHistory} />
                            </div>
                            <div class="column is-three-quarters">
                                <Router onChange={handleRoute}>
                                    <Home path="/" data={this.state} />
                                    <Project path="/projects/" />
                                </Router>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        );
    }
}


export default App;
