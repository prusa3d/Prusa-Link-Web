// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import { PrinterState } from "../../components/telemetry";
interface P {
  printer_state: PrinterState;
}

const Project: preact.FunctionalComponent<P> = ({ printer_state }) => {
  if (process.env.PRINTER != "Original Prusa Mini") {
    const View = require("./project").default;
    return <View printer_state={printer_state} />;
  } else {
    return <div />;
  }
};

export default Project;
