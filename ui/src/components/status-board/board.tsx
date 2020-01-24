// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from 'preact';

interface StatusBoardItemProps {
  title: string,
  value: string | number
}
export interface StatusBoardTableProps {
  readonly remaining_time: string,
  readonly estimated_end: string,
  readonly printing_time: string,
  readonly current_layer: number,
  readonly total_layers: number,
  readonly remaining_material: string | number,
  readonly consumed_material: string | number
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

export const StatusBoardTable = (props: StatusBoardTableProps) => {
  return (
    <Fragment>
      <div class="columns">
        <StatusBoardItem title="remaining time" value={props.remaining_time} />
        <StatusBoardItem title="estimated end" value={props.estimated_end} />
        <StatusBoardItem title="printing time" value={props.printing_time} />
      </div>
      <div class="columns">
        <StatusBoardItem title="layer" value={`${props.current_layer}/${props.total_layers}`} />
        <StatusBoardItem title="remaining resin" value={props.remaining_material} />
        <StatusBoardItem title="consumed resin" value={props.consumed_material} />
      </div>
    </Fragment>
  );
};
