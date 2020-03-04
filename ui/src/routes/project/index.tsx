// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
interface P {
  isPrinting: boolean;
}

const Project: preact.FunctionalComponent<P> = ({ isPrinting }) => {
  if (process.env.PRINTER != "Original Prusa Mini") {
    const View = require("./project").default;
    return <View isPrinting={isPrinting} />;
  } else {
    return <div />;
  }
};

export default Project;
