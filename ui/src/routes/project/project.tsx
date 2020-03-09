// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment, Component } from "preact";
import Title from "../../components/title";
import TreeNode from "../../components/treenode";
import Job from "../../components/job";
import { isPrinting, isPrintingConfirm } from "../../components/utils/states";
import { PrinterState } from "../../components/telemetry";
import ConfirmPrint from "./confirm";
import "./style.scss";

interface P {
  printer_state: PrinterState;
}

class Project extends Component<P, {}> {
  render({ printer_state }, {}) {
    let view;
    if (isPrinting(printer_state)) {
      view = <Job printer_state={printer_state} />;
    } else if (isPrintingConfirm(printer_state)) {
      view = <ConfirmPrint printer_state={printer_state} />;
    } else {
      view = (
        <Fragment>
          <Title id="project.title" default_text="Project files" />
          <TreeNode />
        </Fragment>
      );
    }
    return view;
  }
}

export default Project;
