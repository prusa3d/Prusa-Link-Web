// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";

class TreeNode extends Component<{}, {}> {
  shouldComponentUpdate = () => false;

  render() {
    if (process.env.PRINTER != "Original Prusa Mini") {
      const Tree = require("./tree").default;
      return <Tree />;
    } else {
      return <div />;
    }
  }
}

export default TreeNode;
