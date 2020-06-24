// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";

import { Tree, TreeProps } from "./tree";

class TreeNode extends Component<TreeProps, {}> {
  shouldComponentUpdate = (nextProps, nextState, nextContext) => {
    return this.props.showPreview != nextProps.showPreview;
  };

  render({ onFetch, getApikey, showPreview }, {}) {
    return (
      <Tree onFetch={onFetch} getApikey={getApikey} showPreview={showPreview} />
    );
  }
}

export default TreeNode;
