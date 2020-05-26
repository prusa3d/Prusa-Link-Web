// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";

import { network, apiKey } from "../utils/network";
import Tree from "./tree";

interface P extends network, apiKey {}

class TreeNode extends Component<P, {}> {
  shouldComponentUpdate = () => false;
  render({ onFetch, getApikey }, {}) {
    return <Tree onFetch={onFetch} getApikey={getApikey} />;
  }
}

export default TreeNode;
