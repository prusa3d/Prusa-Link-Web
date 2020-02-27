// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";
import { Router, RouterOnChangeArgs } from "preact-router";
import { IntlProvider } from 'preact-i18n';

import { update, printerState, initPrinterState } from "../components/telemetry";
import { homeProps, Home } from "../routes/home";
//import Project from "../routes/project";
import Header from "./header";
import StatusLeftBoard from "./status-left";
import Temperatures from "../routes/temperatures";
import UnderConstruction from "./under-construction";

interface S extends homeProps {
    currentUrl: string;
    printer_state: printerState;
}

const initState = {
    progress_status: {
        remaining_time: 0,
        printing_time: 0,
        current_layer: 0,
        total_layers: 0,
        remaining_material: 0,
        consumed_material: 0,
    },
    progress_bar: {
        progress: 0,
        project_name: ""
    },
    printer_state: initPrinterState,
    temperatures: []
}

class Container extends Component<{ definition: any }, S> {

    timer = null;
    state = {
        ...initState,
        currentUrl: "/"
    };

    updateData = (data) => {

        this.setState((prevState, props) => {

            const now = new Date().getTime();

            const isOlder = (dt) => now - dt[0] > 200000; // ~ 3min
            let indexOlder = 0;
            if (prevState.temperatures.findIndex(isOlder) > -1) {
                indexOlder = prevState.temperatures.findIndex(e => !isOlder(e));
            }

            return {
                printer_state: { ...prevState.printer_state, ...data.printer_state },
                progress_bar: { ...prevState.progress_bar, ...data.progress_bar },
                progress_status: { ...prevState.progress_status, ...data.progress_status },
                temperatures: prevState.temperatures.slice(indexOlder).concat(data.temperatures)
            };
        });

    }

    clearData = () => {
        this.setState(prev => ({ ...prev, ...initState }));
    }

    componentDidMount() {
        this.timer = setInterval(update(this.updateData, this.clearData), Number(process.env.UPDATE_TIMER));
    }

    componentWillUnmount() {
        clearInterval(this.timer);
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
                                    <StatusLeftBoard printer_state={this.state.printer_state} />
                                </div>
                                <div class="column is-three-quarters-desktop is-full-mobile">
                                    <Router onChange={handleRoute}>
                                        <Home path="/" {...this.state} />
                                        {
                                            process.env.PRINTER != "Original Prusa Mini" &&
                                            <UnderConstruction path="/projects/" />
                                        }
                                        {/* <Project
                                            path="/projects/"
                                            progress_bar={this.state.progress_bar}
                                            progress_status={this.state.progress_status}
                                        />  */}
                                        <Temperatures path="/temperatures/" temperatures={this.state.temperatures} />
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
