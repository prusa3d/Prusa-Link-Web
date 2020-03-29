// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import Title from "../../components/title";
import TreeNode from "../../components/treenode";
import Progress from "../../components/progress";
import { isPrinting } from "../../components/utils/states";
import { PrinterState } from "../../components/telemetry";
import { useTranslation } from "react-i18next";

interface P {
  printer_state: PrinterState;
}

const Project: preact.FunctionalComponent<P> = ({ printer_state }) => {
  const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
  let view;
  if (isPrinting(printer_state)) {
    view = <Progress printer_state={printer_state} />;
  } else {
    view = (
      <Fragment>
        {ready && <Title title={t("proj.title")} />}
        <TreeNode />
      </Fragment>
    );
  }
  return view;
};

export default Project;
