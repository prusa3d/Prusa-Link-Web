// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import { numberFormat, formatTime, formatTimeEnd } from "../utils/index";
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
  return (
    <Fragment>
      <div class="columns">
        <StatusBoardItem
          id="remaining-time"
          title="Remaining time"
          value={formatTime(remaining_time)}
        />
        <StatusBoardItem
          id="estimated-end"
          title="Estimated end"
          value={formatTimeEnd(remaining_time)}
        />
        <StatusBoardItem
          id="printing-time"
          title="Printing time"
          value={formatTime(time_elapsed)}
        />
      </div>
      <div class="columns">
        <StatusBoardItem
          id="layer"
          title="Layer"
          value={total_layers > 0 ? `${current_layer}/${total_layers}` : "0/0"}
        />
        <StatusBoardItem
          id="remaining-resin"
          title="Remaining resin"
          value={`${numberFormat(remaining_material)} ml`}
        />
        <StatusBoardItem
          id="consumed-resin"
          title="Consumed resin"
          value={`${numberFormat(consumed_material)} ml`}
        />
      </div>
    </Fragment>
  );
};
