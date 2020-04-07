// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";

import "./style.scss";
import { network } from "../utils/network";
import { PrinterState } from "../../components/telemetry";

interface P extends network {
  printer_state: PrinterState;
  isHalf?: boolean;
  children?: any;
}

const Progress: preact.FunctionalComponent<P> = ({
  printer_state,
  isHalf,
  children,
  onFetch
}) => {
  if (process.env.IS_SL1) {
    const View = require("./sla").default;
    return (
      <View
        printer_state={printer_state}
        isHalf={isHalf}
        children={children}
        onFetch={onFetch}
      />
    );
  } else {
    return <div />;
  }
};

export default Progress;
