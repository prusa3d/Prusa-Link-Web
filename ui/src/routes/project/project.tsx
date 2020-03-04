// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment, Component } from "preact";
import Title from "../../components/title";
import TreeNode from "../../components/treenode";
import Job from "../../components/job";

interface P {
  isPrinting: boolean;
}

class Project extends Component<P, {}> {
  render({ isPrinting }, {}) {
    let view;
    if (!isPrinting) {
      view = (
        <Fragment>
          <Title id="project.title" default_text="Project files" />
          <TreeNode />
        </Fragment>
      );
    } else {
      view = <Job />;
    }
    return view;
  }
}

export default Project;
