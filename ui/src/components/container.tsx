// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";
import { Router, Route, RouterOnChangeArgs } from "preact-router";
import { IntlProvider } from 'preact-i18n';

import { homeProps, Home } from "../routes/home";
import Project from "../routes/project";
import Header from "./header";
import StatusLeftBoard from "./status-left";
import Temperatures from "../routes/temperatures";

export interface histUpdate {
    updateData(data): void;
}

interface S extends homeProps {
    currentUrl: string;
}

class Container extends Component<{ definition: any }, S> implements histUpdate {

    constructor() {
        super();
        this.state = {
            currentUrl: "/",
            progress_status: {
                remaining_time: "",
                estimated_end: "00:00",
                printing_time: "",
                current_layer: 0,
                total_layers: 0,
                remaining_material: 0,
                consumed_material: 0,
            },
            progress_bar: {
                progress: 0,
                project_name: ""
            },
            temperatures: [],
            showWelcome: true
        };
    }

    updateData = async (data: homeProps) => {

        this.setState((prevState, props) => {

            const now = new Date().getTime();

            const isOlder = (dt) => now - dt[0] > 200000; // ~ 3min
            let indexOlder = 0;
            if (prevState.temperatures.findIndex(isOlder) > -1) {
                indexOlder = prevState.temperatures.findIndex(e => !isOlder(e));
            }

            return {
                progress_bar: { ...prevState.progress_bar, ...data.progress_bar },
                progress_status: { ...prevState.progress_status, ...data.progress_status },
                temperatures: prevState.temperatures.slice(indexOlder).concat(data.temperatures)
            };
        });

    }

    closeWelcome = () => {
        this.setState(prev => ({ ...prev, showWelcome: false }));
    }

    render() {

        const handleRoute = (e: RouterOnChangeArgs) => {
            this.setState((prevState, props) => ({ ...prevState, currentUrl: e.url }));
        };

        return (
            <IntlProvider definition={this.props.definition}>
                <section id="app" class="section">
                    <div class="columns is-vcentered is-centered is-desktop">
                        <div class="column is-three-quarters-desktop is-full-mobile">
                            <Header />
                        </div>
                    </div>
                    <div class="columns is-centered is-desktop">
                        <div class="column is-three-quarters-desktop is-full-mobile">
                            <div class="columns is-centered is-desktop">
                                <div class="column is-full-mobile">
                                    <StatusLeftBoard updateData={this.updateData} />
                                </div>
                                <div class="column is-three-quarters-desktop is-full-mobile">
                                    <Router onChange={handleRoute}>
                                        <Home path="/" {...this.state} closeWelcome={this.closeWelcome} />
                                        <Route path="/projects/" component={Project} />
                                        <Route path="/temperatures/" component={Temperatures} temperatures={this.state.temperatures} />
                                    </Router>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </IntlProvider>
        );
    }
}


export default Container;
