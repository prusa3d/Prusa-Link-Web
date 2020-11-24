// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import StatusLeftItem from "./item";
import { printerState } from "../telemetry";

interface P {
  printer_state: printerState;
  readonly Intl: object;
}

const StatusLeftBoard: preact.FunctionalComponent<P> = ({
  printer_state,
  Intl
}) => {
  const translations = Intl["status-left"];
  const listItems = Object.keys(printer_state).map(propType => (
    <StatusLeftItem
      type={propType}
      value={printer_state[propType]}
      Intl={translations}
    />
  ));

  return <div class="columns is-multiline is-mobile">{listItems}</div>;
};

export default StatusLeftBoard;
