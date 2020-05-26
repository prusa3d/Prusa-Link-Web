// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import { PrinterStatus } from "../telemetry";
import "./style.scss";

interface P {
  printer_status: PrinterStatus;
}

const StatusLeftBoard: preact.FunctionalComponent<P> = props => {
  if (process.env.IS_SL1) {
    const StatusLeftBoard = require("./status-sla").default;
    return <StatusLeftBoard {...props} />;
  } else {
    const StatusLeftBoard = require("./status-mini").default;
    return <StatusLeftBoard {...props} />;
  }
};

export default StatusLeftBoard;
