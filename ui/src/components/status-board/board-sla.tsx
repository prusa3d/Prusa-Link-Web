// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import { useTranslation } from "react-i18next";
import { numberFormat, formatTime, formatEstimatedTime } from "../utils/format";
import StatusBoardItem from "./board-item";

interface P {
  readonly remaining_time: number;
  readonly time_elapsed: number;
  readonly current_layer: number;
  readonly total_layers: number;
  readonly remaining_material: number;
  readonly consumed_material: number;
}

export const initState = {
  remaining_time: 0,
  time_elapsed: 0,
  current_layer: 0,
  total_layers: 0,
  remaining_material: 0,
  consumed_material: 0
};

export const StatusBoardSL1: preact.FunctionalComponent<P> = ({
  remaining_time,
  time_elapsed,
  current_layer,
  total_layers,
  remaining_material,
  consumed_material
}) => {
  const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
  return ready ? (
    <Fragment>
      <div class="columns">
        <StatusBoardItem
          title={t("prop.rem-time")}
          value={formatTime(remaining_time, t("prop.less-than"), "NA")}
        />
        <StatusBoardItem
          title={t("prop.est-end")}
          value={formatEstimatedTime(remaining_time)}
        />
        <StatusBoardItem
          title={t("prop.pnt-time")}
          value={formatTime(time_elapsed, t("prop.less-than"), "NA")}
        />
      </div>
      <div class="columns">
        <StatusBoardItem
          title={t("prop.layers")}
          value={total_layers > 0 ? `${current_layer}/${total_layers}` : "0/0"}
        />
        <StatusBoardItem
          title={t("prop.sla-rmn-mt")}
          value={
            remaining_material > 0
              ? `${numberFormat(remaining_material)} ml`
              : "NA"
          }
        />
        <StatusBoardItem
          title={t("prop.sla-csm-mt")}
          value={
            consumed_material > 0
              ? `${numberFormat(consumed_material)} ml`
              : "NA"
          }
        />
      </div>
    </Fragment>
  ) : (
    <Fragment />
  );
};
