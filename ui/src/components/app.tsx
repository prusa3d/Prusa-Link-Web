import { h, Component } from "preact";
import { Route, Router, RouterOnChangeArgs } from "preact-router";

import Home from "../routes/home";
import Project from "../routes/project";
import Header from "./header";
import StatusLeftBoard from "./status-left";

interface S {
    [propName: string]: string | number;
}

class App extends Component<{}, S> {

    constructor() {
        super();
        this.state = {};
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
                                <StatusLeftBoard {...this.state} />
                            </div>
                            <div class="column is-three-quarters">
                                <Router onChange={handleRoute}>
                                    <Route path="/" component={Home} />
                                    <Route path="/projects/" component={Project} />
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
