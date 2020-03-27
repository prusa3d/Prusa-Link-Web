// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";

const Upload = props => {
  if (process.env.IS_SL1) {
    const Uploaded = require("./component").default;
    return <Uploaded {...props} />;
  } else {
    return <div />;
  }
};

export default Upload;
