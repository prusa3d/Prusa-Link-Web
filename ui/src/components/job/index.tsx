// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from 'preact';
import { StatusBoardTable, StatusBoardTableProps } from '../status-board/board';
import { StatusProgress, StatusProgressProps } from "../status-board/progress";

interface S {
}

export interface JobProps {
  progress_bar: StatusProgressProps;
  progress_status: StatusBoardTableProps;
}

export class Job extends Component<JobProps, S> {

  render() {

    return (
      <div class="columns is-multiline is-mobile">
        <div class="column is-full">
          <StatusProgress {...this.props.progress_bar} />
        </div>
        <div class="column is-full">
          <StatusBoardTable {...this.props.progress_status} />
        </div>
      </div>
    );

  }

}
