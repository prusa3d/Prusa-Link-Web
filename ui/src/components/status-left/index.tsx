// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from 'preact';
import StatusLeftItem from "./item";
import { printerState } from "../telemetry";

interface P {
  printer_state: printerState;
}

const StatusLeftBoard: preact.FunctionalComponent<P> = props => {
  const { printer_state } = props;
  const listItems = Object.keys(printer_state).map(propType =>
    <StatusLeftItem type={propType} value={printer_state[propType]} />
  );

  return (
    <div class="columns is-multiline is-mobile">
      {listItems}
    </div>
  );
}

export default StatusLeftBoard;