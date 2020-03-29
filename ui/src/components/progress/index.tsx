// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import { PrinterState } from "../../components/telemetry";
import "./style.scss";

interface P {
  printer_state: PrinterState;
  isHalf?: boolean;
  children?: any;
}

const Progress: preact.FunctionalComponent<P> = ({
  printer_state,
  isHalf,
  children
}) => {
  if (process.env.IS_SL1) {
    const View = require("./sla").default;
    return (
      <View printer_state={printer_state} isHalf={isHalf} children={children} />
    );
  } else {
    return <div />;
  }
};

export default Progress;
