import { h } from "preact";
import { Route, Router, RouterOnChangeArgs } from "preact-router";

import { Config } from "../index";
import Home from "../routes/home";
import Profile from "../routes/profile";
import Header from "./header";
import StatusLeftBoard from "./status-left";

const App = () => {
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
                            <Config.Consumer>
                                {config => {
                                    return <StatusLeftBoard {...config} />
                                }}
                            </Config.Consumer>
                        </div>
                        <div class="column is-three-quarters">
                            <Router onChange={handleRoute}>
                                <Route path="/" component={Home} />
                                <Route path="/profile/" component={Profile} />
                            </Router>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default App;
