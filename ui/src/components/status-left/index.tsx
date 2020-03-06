// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import StatusLeftItem from "./item";
import { PrinterStatus } from "../telemetry";

interface P {
  printer_status: PrinterStatus;
}

const StatusLeftBoard: preact.FunctionalComponent<P> = ({ printer_status }) => {
  const listItems = Object.keys(printer_status).map(propType => (
    <StatusLeftItem type={propType} value={printer_status[propType]} />
  ));
  return <div class="columns is-multiline is-mobile">{listItems}</div>;
};

export default StatusLeftBoard;
