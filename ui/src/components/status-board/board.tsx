// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";

interface StatusBoardItemProps {
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

interface BoardProps extends StatusBoardTableProps {
  readonly Intl: object;
}

const StatusBoardItem = (props: StatusBoardItemProps) => {
  return (
    <div class="column is-one-third">
      <p class="subtitle is-size-3 is-size-6-desktop has-text-grey">
        {props.title}
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
  Intl: object;
}> = props => {
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
      plus_days = props.Intl["today-at"] + " ";
    } else if (
      end.getUTCDate() == tomorrow.getUTCDate() &&
      end.getUTCMonth() == tomorrow.getUTCMonth()
    ) {
      plus_days = props.Intl["tmw-at"] + " ";
    } else {
      let options = { month: "numeric", day: "numeric", timeZone: "UTC" };
      const final_date = end.toLocaleString(window.navigator.language, options);
      plus_days = `${final_date} ${props.Intl["at"]} `;
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
        {props.Intl["estimated-end"]}
      </p>
      <p class="title is-size-2 is-size-5-desktop has-text-white">
        {estimated_end}
      </p>
    </div>
  );
};

export const StatusBoardMini = ({
  pos_z_mm,
  printing_speed,
  flow_factor,
  print_dur,
  time_est,
  time_zone,
  Intl
}: BoardProps) => {
  const available = (value, unit = null) =>
    value ? value + (unit ? " " + unit : "") : "NA";
  let translate = Intl["status-board"];
  return (
    <Fragment>
      <div class="columns">
        <StatusBoardItem
          title={translate["pos_z_mm"]}
          value={available(pos_z_mm, "mm")}
        />
        <StatusBoardItem
          title={translate["flow-factor"]}
          value={available(flow_factor)}
        />
        <StatusBoardItem
          title={translate["printing-speed"]}
          value={available(printing_speed, "%")}
        />
      </div>
      <div class="columns">
        <EstimatedEndItem
          time_est={time_est}
          time_zone={time_zone}
          Intl={translate}
        />
        <StatusBoardItem
          title={translate["print-dur"]}
          value={available(print_dur)}
        />
      </div>
    </Fragment>
  );
};
