// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import { Text, withText } from "preact-i18n";
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

export const StatusBoardSL1: preact.FunctionalComponent<P> = withText({
  less_time: <Text id="status-board.less-than-minute">Less than a minute</Text>
})(
  ({
    remaining_time,
    time_elapsed,
    current_layer,
    total_layers,
    remaining_material,
    consumed_material,
    less_time
  }) => {
    return (
      <Fragment>
        <div class="columns">
          <StatusBoardItem
            id="remaining-time"
            title="Remaining time"
            value={formatTime(remaining_time, less_time, "NA")}
          />
          <StatusBoardItem
            id="estimated-end"
            title="Estimated end"
            value={formatEstimatedTime(remaining_time)}
          />
          <StatusBoardItem
            id="printing-time"
            title="Printing time"
            value={formatTime(time_elapsed, less_time, "NA")}
          />
        </div>
        <div class="columns">
          <StatusBoardItem
            id="layer"
            title="Layer"
            value={
              total_layers > 0 ? `${current_layer}/${total_layers}` : "0/0"
            }
          />
          <StatusBoardItem
            id="remaining-resin"
            title="Remaining resin"
            value={
              remaining_material > 0
                ? `${numberFormat(remaining_material)} ml`
                : "NA"
            }
          />
          <StatusBoardItem
            id="consumed-resin"
            title="Consumed resin"
            value={
              consumed_material > 0
                ? `${numberFormat(consumed_material)} ml`
                : "NA"
            }
          />
        </div>
      </Fragment>
    );
  }
);
