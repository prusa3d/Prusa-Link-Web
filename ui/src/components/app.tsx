// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";
import { Router, RouterOnChangeArgs } from "preact-router";
import { STATE_IDLE } from "./utils/states";

import {
  update,
  PrinterStatus,
  PrinterState,
  initPrinterState
} from "./telemetry";
import Home from "../routes/home";
import Project from "../routes/project";
import Header from "./header";
import StatusLeftBoard from "./status-left";
import Temperatures from "../routes/temperatures";

interface S {
  currentUrl: string;
  temperatures: Array<Array<number>>;
  printer_status: PrinterStatus;
  printer_state: PrinterState;
}

const initState = {
  printer_status: initPrinterState,
  temperatures: [],
  printer_state: { state: STATE_IDLE }
};

class App extends Component<{}, S> {
  timer = null;
  state = {
    ...initState,
    currentUrl: "/"
  };

  updateData = data => {
    this.setState((prevState, props) => {
      const now = new Date().getTime();

      const isOlder = dt => now - dt[0] > 200000; // ~ 3min
      let indexOlder = 0;
      if (prevState.temperatures.findIndex(isOlder) > -1) {
        indexOlder = prevState.temperatures.findIndex(e => !isOlder(e));
      }

      return {
        printer_status: { ...prevState.printer_status, ...data.printer_status },
        printer_state: data.printer_state,
        temperatures: prevState.temperatures
          .slice(indexOlder)
          .concat(data.temperatures)
      };
    });
  };

  clearData = () => {
    this.setState(prev => ({ ...prev, ...initState }));
  };

  componentDidMount() {
    this.timer = setInterval(
      update(this.updateData, this.clearData),
      Number(process.env.UPDATE_PRINTER)
    );
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  render() {
    const handleRoute = (e: RouterOnChangeArgs) => {
      this.setState((prevState, props) => ({
        ...prevState,
        currentUrl: e.url
      }));
    };
    return (
      <section id="app" class="section">
        <div class="columns is-vcentered is-centered is-desktop prusa-line">
          <div class="column is-three-quarters-desktop is-full-mobile is-paddingless">
            <Header />
          </div>
        </div>
        <div class="columns is-centered is-desktop prusa-after-nav">
          <div class="column is-three-quarters-desktop is-full-mobile">
            <div class="columns is-centered is-desktop">
              <div class="column is-full-mobile">
                <StatusLeftBoard printer_status={this.state.printer_status} />
              </div>
              <div class="column is-three-quarters-desktop is-full-mobile">
                <Router onChange={handleRoute}>
                  <Home
                    path="/"
                    temperatures={this.state.temperatures}
                    printer_state={this.state.printer_state}
                  />
                  <Project
                    path="/projects/"
                    printer_state={this.state.printer_state}
                  />
                  <Temperatures
                    path="/temperatures/"
                    temperatures={this.state.temperatures}
                  />
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
