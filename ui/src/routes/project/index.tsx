// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";

import { network, apiKey } from "../../components/utils/network";
import { PrinterState } from "../../components/telemetry";

interface P extends network, apiKey {
  printer_state: PrinterState;
}

const Project: preact.FunctionalComponent<P> = props => {
  if (process.env.IS_SL1) {
    const View = require("./project").default;
    return <View {...props} />;
  } else {
    return <div />;
  }
};

export default Project;
