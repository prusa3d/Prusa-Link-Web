// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";
import Tree from "./tree";

class TreeNode extends Component<{}, {}> {
  shouldComponentUpdate = () => false;
  render() {
    return <Tree />;
  }
}

export default TreeNode;
