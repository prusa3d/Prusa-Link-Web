// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import TreeNode from "../../components/treenode";
import Progress from "../../components/progress";
import { isPrinting } from "../../components/utils/states";
import { PrinterState } from "../../components/telemetry";

interface P {
  printer_state: PrinterState;
}

const Project: preact.FunctionalComponent<P> = ({ printer_state }) => {
  let view;
  if (isPrinting(printer_state)) {
    view = <Progress printer_state={printer_state} />;
  } else {
    view = <TreeNode />;
  }
  return view;
};

export default Project;
