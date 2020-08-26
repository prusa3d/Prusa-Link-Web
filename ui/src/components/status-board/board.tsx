// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import { Text, withText } from "preact-i18n";
import { numberFormat, formatTime, formatTimeEnd } from "../utils/index";

interface StatusBoardItemProps {
  id: string;
  title: string;
  value: string | number;
}
export interface StatusBoardTableProps {
  readonly remaining_time?: number;
  readonly printing_time?: number;
  readonly current_layer?: number;
  readonly total_layers?: number;
  readonly remaining_material?: number;
  readonly consumed_material?: number;
  readonly pos_z_mm?: number;
  readonly printing_speed?: number;
  readonly flow_factor?: number;
  readonly print_dur?: number;
  readonly filament_status?: string;
  readonly time_est?: number;
  readonly time_zone?: number;
}

const StatusBoardItem = (props: StatusBoardItemProps) => {
  return (
    <div class="column is-one-third">
      <p class="subtitle is-size-3 is-size-6-desktop has-text-grey">
        <Text id={`status-board.${props.id}`}>{props.title}</Text>
      </p>
      <p class="title is-size-2 is-size-5-desktop has-text-white">
        {props.value}
      </p>
    </div>
  );
};

const EstimatedEndItem: preact.FunctionalComponent<{
  time_est: number;
  time_zone: number;
}> = withText({
  today: <Text id="status-board.today-at">Today at</Text>,
  tmw: <Text id="status-board.tmw-at">Tomorrow at</Text>,
  at: <Text id="status-board.at">at</Text>
})(props => {
  let estimated_end = "00:00";
  if (props.time_est) {
    let now = new Date(new Date().getTime() + props.time_zone * 3600000);
    let end = new Date(now.getTime() + props.time_est * 1000);
    let tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let plus_days = "";
    if (
      end.getUTCDate() == now.getUTCDate() &&
      end.getUTCMonth() == now.getUTCMonth()
    ) {
      plus_days = props.today + " ";
    } else if (
      end.getUTCDate() == tomorrow.getUTCDate() &&
      end.getUTCMonth() == tomorrow.getUTCMonth()
    ) {
      plus_days = props.tmw + " ";
    } else {
      let options = { month: "numeric", day: "numeric", timeZone: "UTC" };
      const final_date = end.toLocaleString(window.navigator.language, options);
      plus_days = `${final_date} ${props.at} `;
    }

    estimated_end =
      plus_days +
      ("0" + end.getUTCHours()).substr(-2) +
      ":" +
      ("0" + end.getUTCMinutes()).substr(-2);
  }

  return (
    <div class="column is-one-third">
      <p class="subtitle is-size-3 is-size-6-desktop has-text-grey">
        <Text id={"status-board.estimated-end"}>Estimated end</Text>
      </p>
      <p class="title is-size-2 is-size-5-desktop has-text-white">
        {estimated_end}
      </p>
    </div>
  );
});

export const StatusBoardSL1 = ({
  remaining_time,
  printing_time,
  current_layer,
  total_layers,
  remaining_material,
  consumed_material
}: StatusBoardTableProps) => {
  return (
    <Fragment>
      <div class="columns">
        <StatusBoardItem
          id="remaining-time"
          title="Remaining time"
          value={remaining_time > 0 ? formatTime(remaining_time) : "0 min"}
        />
        <StatusBoardItem
          id="estimated-end"
          title="Estimated end"
          value={remaining_time > 0 ? formatTimeEnd(remaining_time) : "00:00"}
        />
        <StatusBoardItem
          id="printing-time"
          title="Printing time"
          value={printing_time > 0 ? formatTime(printing_time) : "0 min"}
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

export const StatusBoardMini = ({
  pos_z_mm,
  printing_speed,
  flow_factor,
  print_dur,
  time_est,
  time_zone
}: StatusBoardTableProps) => {
  const available = (value, unit = null) =>
    value ? value + (unit ? " " + unit : "") : "NA";
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
        <EstimatedEndItem time_est={time_est} time_zone={time_zone} />
        <StatusBoardItem
          id="print-dur"
          title="Printing time"
          value={available(print_dur)}
        />
      </div>
    </Fragment>
  );
};

export const StatusBoardTable = (props: StatusBoardTableProps) => {
  if (process.env.PRINTER == "Original Prusa Mini") {
    return <StatusBoardMini {...props} />;
  } else {
    return <StatusBoardSL1 {...props} />;
  }
};
