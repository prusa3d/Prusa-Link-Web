// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import StatusBoardItem from "./board-item";
import { available } from "../utils/index";

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
  return (
    <Fragment>
      <div class="columns">
        <StatusBoardItem
          id="pos_z_mm"
          title="Z-Height"
          value={available(pos_z_mm, "mm")}
        />
        <StatusBoardItem
          id="printing-speed"
          title="Printing Speed"
          value={available(printing_speed, "%")}
        />
        <StatusBoardItem
          id="flow-factor"
          title="Printing Flow"
          value={available(flow_factor)}
        />
      </div>
      <div class="columns">
        <StatusBoardItem
          id="time-est"
          title="Remaining time"
          value={available(print_dur)}
        />
        <StatusBoardItem
          id="print-dur"
          title="Printing time"
          value={available(time_est)}
        />
        <StatusBoardItem
          id="filament-status"
          title="Filament sensor"
          value={available(filament_status)}
        />
      </div>
    </Fragment>
  );
};
