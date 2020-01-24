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
    currentUrl:string;
}

class Container extends Component<{ definition: any}, S> implements histUpdate {

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
            temperatures: {
                temp_led: [],
                temp_amb: [],
                temp_cpu: []
            }
        };
    }

    updateData = async (data: homeProps) => {

        this.setState((prevState, props) => {

            const now = new Date().getTime();
            let newTemperatures = {
                temp_led: [],
                temp_amb: [],
                temp_cpu: []
            };
            const isOlder = (dt) => now - dt.x > 200000; // ~ 3min

            const temperatures = data.temperatures;
            for (let temp of Object.keys(temperatures)) {

                let new_temp = prevState.temperatures[temp].concat([{ x: now, y: temperatures[temp] }])
                let minOlder = new_temp.findIndex(isOlder);
                if (minOlder > -1) {
                    let maxOlder = new_temp.findIndex(e => !isOlder(e));
                    new_temp.splice(0, maxOlder);
                }

                newTemperatures[temp] = new_temp;

            }
            return {
                progress_bar: { ...prevState.progress_bar, ...data.progress_bar },
                progress_status: { ...prevState.progress_status, ...data.progress_status },
                temperatures: newTemperatures
            };
        });

    }

    render() {

        const handleRoute = (e: RouterOnChangeArgs) => {
            this.setState((prevState, props) => ({...prevState, currentUrl: e.url }));
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
                                    <Home path="/" {...this.state} />
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
