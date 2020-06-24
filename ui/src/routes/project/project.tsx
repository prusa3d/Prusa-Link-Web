// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";

import { network, apiKey } from "../../components/utils/network";
import TreeNode from "../../components/treenode";
import Progress from "../../components/progress";
import { isPrinting, isPrintingConfirm } from "../../components/utils/states";
import { PrinterState } from "../../components/telemetry";

interface P extends network, apiKey {
  printer_state: PrinterState;
}

const Project: preact.FunctionalComponent<P> = ({
  printer_state,
  onFetch,
  getApikey
}) => {
  let view;
  if (isPrinting(printer_state)) {
    view = <Progress printer_state={printer_state} onFetch={onFetch} />;
  } else {
    view = (
      <TreeNode
        onFetch={onFetch}
        getApikey={getApikey}
        showPreview={isPrintingConfirm(printer_state)}
      />
    );
  }
  return view;
};

export default Project;
