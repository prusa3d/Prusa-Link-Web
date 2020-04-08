// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import { useTranslation } from "react-i18next";
import StatusBoardItem from "./board-item";
import { available } from "../utils/format";

interface P {
  readonly pos_z_mm: number;
  readonly printing_speed: number;
  readonly flow_factor: number;
  readonly print_dur: number;
  readonly time_est: string;
  readonly filament_status: string;
}

export const initState = {
  pos_z_mm: 0,
  printing_speed: 0,
  flow_factor: 0,
  print_dur: "",
  time_est: "",
  filament_status: ""
};

export const StatusBoardMini: preact.FunctionalComponent<P> = ({
  pos_z_mm,
  printing_speed,
  flow_factor,
  print_dur,
  time_est,
  filament_status
}) => {
  const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
  return ready ? (
    <Fragment>
      <div class="columns">
        <StatusBoardItem
          title={t("prop.z-height").toLowerCase()}
          value={available(pos_z_mm, "mm")}
        />
        <StatusBoardItem
          title={t("prop.speed").toLowerCase()}
          value={available(printing_speed, "%")}
        />
        <StatusBoardItem
          title={t("prop.flow").toLowerCase()}
          value={available(flow_factor)}
        />
      </div>
      <div class="columns">
        <StatusBoardItem
          title={t("prop.rem-time").toLowerCase()}
          value={available(time_est)}
        />
        <StatusBoardItem
          title={t("prop.pnt-time").toLowerCase()}
          value={available(print_dur)}
        />
        <StatusBoardItem
          title={t("prop.fdm-sensor").toLowerCase()}
          value={available(filament_status)}
        />
      </div>
    </Fragment>
  ) : (
    <Fragment />
  );
};
