// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import "./style.scss";
export interface TempProps {
  temperatures: Array<Array<number>>;
}

interface P extends TempProps {
  bigSize: boolean;
}

export const Temperature: preact.FunctionalComponent<P> = props => {
  if (process.env.PRINTER == "Original Prusa SL1") {
    const Temperature = require("./temp-sla").default;
    return <Temperature {...props} />;
  } else {
    const Temperature = require("./temp-mini").default;
    return <Temperature {...props} />;
  }
};
