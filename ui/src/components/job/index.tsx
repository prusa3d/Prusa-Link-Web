// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";
import "./style.scss";
import JobProgress from "./progress";
import Cancel from "./cancel";
import Refill from "./refill";
import ExposureTimes from "./exposure-times";
import { PrinterState } from "../telemetry";
import { isPrintingFeedMe } from "../utils/states";

interface P {
  printer_state: PrinterState;
}

interface S {
  show: number;
}

class Job extends Component<P, S> {
  state = { show: 0 };

  substate = 0;
  shouldComponentUpdate = ({ printer_state }, nextState) => {
    const change_substate = printer_state.substate != this.substate;
    this.substate = printer_state.substate;
    return this.state.show == 0 || change_substate;
  };

  onclick = (nextShow: number) => {
    this.setState({ show: nextShow });
  };

  onBack = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ show: 0 }, () => {
      this.forceUpdate();
    });
  };

  render({ printer_state }, { show }) {
    if (isPrintingFeedMe(printer_state)) {
      return <Refill printer_state={printer_state} onBack={this.onBack} />;
    }
    switch (show) {
      case 1:
        return <ExposureTimes onBack={this.onBack} />;
      case 2:
        return <Refill printer_state={printer_state} onBack={this.onBack} />;
      case 3:
        return <Cancel printer_state={printer_state} onBack={this.onBack} />;
      default:
        return (
          <JobProgress printer_state={printer_state} onclick={this.onclick} />
        );
    }
  }
}

export default Job;
