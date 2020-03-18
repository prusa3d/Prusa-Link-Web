// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";
import "./style.scss";
import ExposureTimes from "../job/exposure-times";
import { PrinterState } from "../telemetry";
import Confirm from "./confirm";

interface P {
  printer_state: PrinterState;
}

interface S {
  show: number;
}

class ConfirmPrint extends Component<P, S> {
  state = { show: 0 };

  shouldComponentUpdate = () => false;

  onclick = (nextShow: number) => {
    this.setState({ show: nextShow });
    this.forceUpdate();
  };

  onBack = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ show: 0 }, () => {
      this.forceUpdate();
    });
  };

  render({ printer_state }, { show }) {
    switch (show) {
      case 1:
        return <ExposureTimes onBack={this.onBack} />;
      default:
        return <Confirm printer_state={printer_state} onclick={this.onclick} />;
    }
  }
}

export default ConfirmPrint;
