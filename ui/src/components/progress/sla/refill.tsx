// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component, Fragment } from "preact";
import { Translation } from "react-i18next";

import { network } from "../../utils/network";
import Title from "../../title";
import { YesButton, NoButton } from "../../buttons";
import ExampleImage1 from "../../../assets/refill.jpg";
import ExampleImage2 from "../../../assets/tank.jpg";
import { PrinterState } from "../../telemetry";
import { isPrintingFeedMe } from "../../utils/states";

interface S {
  show: number;
}

interface P extends network {
  printer_state: PrinterState;
  onBack(e: Event): void;
}

class Refill extends Component<P, {}> {
  onBack = (e: MouseEvent) => {
    this.props.onFetch({
      url: "/api/job/material?value=back",
      then: response => this.props.onBack(e)
    });
  };

  onYES = (e: MouseEvent) => {
    this.props.onFetch({
      url: "/api/job/material?value=continue",
      then: response => this.props.onBack(e)
    });
  };

  render() {
    const is_disabled = !isPrintingFeedMe(this.props.printer_state);
    return (
      // @ts-ignore
      <Translation useSuspense={false}>
        {(t, { i18n }, ready) =>
          ready && (
            <Fragment>
              <Title title={t("refill.title")} onFetch={this.props.onFetch} />
              <div class="columns is-multiline is-mobile is-centered is-vcentered">
                <div class="column is-full">
                  <p class="prusa-default-text">{t("msg.sla-fly-fill")}</p>
                </div>
                <div class="column is-full">
                  <div class="columns">
                    <div class="column">
                      <img src={ExampleImage1} />
                    </div>
                    <div class="column">
                      <img src={ExampleImage2} />
                    </div>
                  </div>
                </div>
                <div class="column is-full">
                  <div class="prusa-button-wrapper">
                    <YesButton
                      text={t("btn.sla-refilled").toLowerCase()}
                      onClick={this.onYES}
                      wrap
                      disabled={is_disabled}
                    />
                    <NoButton
                      text={t("btn.no").toLowerCase()}
                      onClick={this.onBack}
                      wrap
                      disabled={is_disabled}
                    />
                  </div>
                </div>
              </div>
            </Fragment>
          )
        }
      </Translation>
    );
  }
}

export default Refill;
