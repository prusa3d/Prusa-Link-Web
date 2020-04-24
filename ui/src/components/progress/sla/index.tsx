// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";

import { network } from "../../utils/network";
import JobProgress from "./progress";
import Cancel from "../cancel";
import Refill from "./refill";
import ExposureTimes from "./exposure-times";
import { PrinterState } from "../../telemetry";
import { isPrintingFeedMe, isPrintingPending } from "../../utils/states";
import Loading from "../../loading";

interface P extends network {
  printer_state: PrinterState;
  isHalf: boolean;
  children?: any;
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
    this.setState({ show: nextShow }, () => {
      this.forceUpdate();
    });
  };

  onBack = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ show: 0 }, () => {
      this.forceUpdate();
    });
  };

  render({ printer_state, isHalf, children, onFetch }, { show }) {
    if (isPrintingPending(printer_state)) {
      return (
        <div class="columns is-multiline is-mobile">
          <Loading />
          {children && children}
        </div>
      );
    } else if (isPrintingFeedMe(printer_state)) {
      return (
        <Refill
          printer_state={printer_state}
          onBack={this.onBack}
          onFetch={onFetch}
        />
      );
    } else if (show == 1) {
      return <ExposureTimes onBack={this.onBack} onFetch={onFetch} />;
    } else if (show == 3) {
      return (
        <Cancel
          printer_state={printer_state}
          onBack={this.onBack}
          onFetch={onFetch}
        />
      );
    } else {
      return (
        <JobProgress
          printer_state={printer_state}
          onclick={this.onclick}
          isHalf={isHalf}
          children={children}
          onFetch={onFetch}
        />
      );
    }
  }
}

export default Job;
