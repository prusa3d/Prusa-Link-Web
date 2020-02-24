// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from 'preact';
import { Text } from 'preact-i18n';
import { numberFormat, formatTime, formatTimeEnd } from "../utils/index";

interface StatusBoardItemProps {
  id: string,
  title: string,
  value: string | number
}
export interface StatusBoardTableProps {
  readonly remaining_time: number,
  readonly printing_time: number,
  readonly current_layer: number,
  readonly total_layers: number,
  readonly remaining_material?: number,
  readonly consumed_material?: number
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

export const StatusBoardTable = ({
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
        <StatusBoardItem id="remaining-time" title="remaining time" value={remaining_time > 0 ? formatTime(remaining_time) : ""} />
        <StatusBoardItem id="estimated-end" title="estimated end" value={remaining_time > 0 ? formatTimeEnd(remaining_time) : ""} />
        <StatusBoardItem id="printing-time" title="printing time" value={printing_time > 0 ? formatTime(printing_time) : ""} />
      </div>
      <div class="columns">
        <StatusBoardItem id="layer" title="layer" value={current_layer > 0 ? `${current_layer}/${total_layers}` : "0/0"} />
        {
          process.env.PRINTER != "Original Prusa Mini" &&
          <StatusBoardItem id="remaining-resin" title="remaining resin" value={`${numberFormat(remaining_material)} ml`} />
        }
        {
          process.env.PRINTER != "Original Prusa Mini" &&
          <StatusBoardItem id="consumed-resin" title="consumed resin" value={`${numberFormat(consumed_material)} ml`} />
        }
      </div>
    </Fragment>
  );
};
