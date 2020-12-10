// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";
import { Router, RouterOnChangeArgs, route } from "preact-router";
import { useTranslation } from "react-i18next";

import {
  update,
  PrinterStatus,
  PrinterState,
  initPrinterState
} from "./telemetry";
import { STATE_IDLE } from "./utils/states";
import { networkProps, network, apiKey } from "./utils/network";
import Home from "../routes/home";
import Project from "../routes/project";
import Header from "./header";
import StatusLeftBoard from "./status-left";
import Temperatures from "../routes/temperatures";
import Loging from "./apikey";
import Toast from "./toast";
import { Error401 } from "./errors";

interface S {
  currentUrl: string;
  temperatures: Array<Array<number>>;
  printer_status: PrinterStatus;
  printer_state: PrinterState;
  apikey: string;
  last_error: number;
}

const initState = {
  printer_status: initPrinterState,
  temperatures: [],
  printer_state: { state: STATE_IDLE },
  last_error: 500
};

class App extends Component<{}, S> implements network, apiKey {
  timer = null;
  state = {
    ...initState,
    currentUrl: "/",
    apikey: process.env.APIKEY
  };

  onFetch = ({
    url,
    then,
    options = { method: "GET", headers: {} },
    except = e => {}
  }: networkProps) => {
    options.headers["X-Api-Key"] = this.state.apikey;
    fetch(url, options)
      .then(async function(response) {
        if (!response.ok) {
          const error = Error(await response.text());
          error.name = "" + response.status;
          throw error;
        }
        if (window.location.pathname == "/login-failed") {
          route("/", true);
        }
        return response;
      })
      .then(function(response) {
        then(response);
      })
      .catch(e => {
        if (e.name === "401") {
          if (window.location.pathname != "/login-failed") {
            route("/login-failed", true);
          }
        } else if (e.name === "403") {
          this.setState({ apikey: null });
        }
        except(e);
      });
  };

  getApikey = (): string => this.state.apikey;

  notify = (error_code: string) => {
    const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
    return new Promise<string>(function(resolve, reject) {
      if (ready) {
        if (error_code == "#10307") {
          resolve(t("ntf.e-307"));
        }
      }
    }).then(message => Toast.error(t("ntf.error"), message));
  };

  updateData = data => {
    this.setState((prevState, props) => {
      const now = new Date().getTime();

      const isOlder = dt => now - dt[0] > 200000; // ~ 3min
      let indexOlder = 0;
      if (prevState.temperatures.findIndex(isOlder) > -1) {
        indexOlder = prevState.temperatures.findIndex(e => !isOlder(e));
      }

      const error_code = data.printer_state.error_code;
      if (error_code != prevState.last_error) {
        this.notify(error_code);
      }

      return {
        printer_status: { ...prevState.printer_status, ...data.printer_status },
        printer_state: data.printer_state,
        temperatures: prevState.temperatures
          .slice(indexOlder)
          .concat(data.temperatures),
        last_error: error_code
      };
    });
  };

  clearData = () => {
    this.setState(prev => ({ ...prev, ...initState }));
  };

  componentDidMount() {
    this.timer = setInterval(
      () =>
        this.onFetch({
          url: "/api/telemetry",
          then: update(this.updateData),
          except: e => this.clearData(),
          options: {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json"
            }
          }
        }),
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

    const is_mobile = window.innerWidth < 1024;
    const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
    return (
      <section id="app" class="section">
        {this.state.apikey == null && (
          <Loging
            setApikey={value =>
              this.setState((prevState, props) => ({
                ...prevState,
                apikey: value
              }))
            }
          />
        )}
        <div class="columns is-vcentered is-centered is-desktop prusa-line">
          <div class="column is-three-quarters-desktop is-full-mobile is-paddingless">
            <Header />
          </div>
        </div>
        <div class="columns is-centered is-desktop prusa-after-nav">
          <div class="column is-three-quarters-desktop is-full-mobile">
            <div class="columns is-centered is-desktop">
              {!is_mobile && (
                <div class="column is-full-mobile">
                  <StatusLeftBoard printer_status={this.state.printer_status} />
                </div>
              )}
              <div class="column is-three-quarters-desktop is-full-mobile">
                <Router onChange={handleRoute}>
                  <Home
                    path="/"
                    temperatures={this.state.temperatures}
                    printer_state={this.state.printer_state}
                    onFetch={this.onFetch}
                    getApikey={this.getApikey}
                  />
                  <Project
                    path="/projects/"
                    printer_state={this.state.printer_state}
                    onFetch={this.onFetch}
                    getApikey={this.getApikey}
                  />
                  <Temperatures
                    path="/temperatures/"
                    temperatures={this.state.temperatures}
                    onFetch={this.onFetch}
                  />
                  <Error401 path="/login-failed" />
                  <div class="txt-normal txt-size-2" default>
                    <p>UH, OH.</p>
                    <p>404</p>
                  </div>
                </Router>
              </div>
              {is_mobile && (
                <div class="column is-full-mobile">
                  <div class="column is-full mobile_margin">
                    <p class="txt-bold txt-grey txt-size-2 is-marginless prusa-line">
                      {ready ? t("glob.hd-st") : ""}
                    </p>
                  </div>
                  <StatusLeftBoard printer_status={this.state.printer_status} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }
}

export default App;
