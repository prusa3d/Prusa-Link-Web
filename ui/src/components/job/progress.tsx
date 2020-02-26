// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from 'preact';
import { Text } from 'preact-i18n';
import { StatusBoardTable, StatusBoardTableProps } from '../status-board/board';
import { StatusProgress, StatusProgressProps } from "../status-board/progress";


export interface ProgressProps {
  progress_bar: StatusProgressProps;
  progress_status: StatusBoardTableProps;
}

interface P extends ProgressProps {
  onclick(nextShow: number): void;
}

export const JobProgress: preact.FunctionalComponent<P> = props => {

  const onclick = (e: Event, nextShow: number) => {
    e.preventDefault();
    e.stopPropagation();
    props.onclick(nextShow);
  }

  return (
    <div class="columns is-multiline is-mobile">
      <div class="column is-full">
        <StatusProgress {...props.progress_bar} />
      </div>
      <div class="column is-full">
        <StatusBoardTable {...props.progress_status} />
      </div>
      <div class="column is-full prusa-job-buttons-tab">
        <div class="columns is-centered">
          <div class="column prusa-flex-no-grow">
            <button
              class="button has-background-grey prusa-job-button title is-size-3 is-size-5-desktop"
              onClick={e => onclick(e, 1)}
            >
              <img class="media-left image is-24x24" src={require("../../assets/exposure_times_color.svg")} />
              <Text id={"project.change-exposure"}>change exposure times</Text>
            </button>
          </div>
          <div class="column prusa-flex-no-grow">
            <button
              class="button has-background-grey prusa-job-button title is-size-3 is-size-5-desktop"
              onClick={e => onclick(e, 2)}
            >
              <img class="media-left image is-24x24" src={require("../../assets/refill_color.svg")} />
              <Text id={"project.refill-resin"}>refill resin</Text>
            </button>
          </div>
          <div class="column prusa-flex-no-grow">
            <button class="button has-background-success prusa-job-button title is-size-3 is-size-5-desktop"
              onClick={e => onclick(e, 3)}
            >
              <img class="media-left image is-24x24" src={require("../../assets/cancel.svg")} />
              <Text id={"project.cancel-print"}>cancel print</Text>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

}
