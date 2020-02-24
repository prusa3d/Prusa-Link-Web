// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component, Fragment } from 'preact';
import { Text } from 'preact-i18n';
import { StatusBoardTable, StatusBoardTableProps } from '../status-board/board';
import { StatusProgress, StatusProgressProps } from "../status-board/progress";
import "./style.scss";

interface S {
}

export interface JobProps {
  progress_bar: StatusProgressProps;
  progress_status: StatusBoardTableProps;
}

export class Job extends Component<JobProps, S> {

  render() {

    return (
      <Fragment>
        <div class="columns is-multiline is-mobile">
          <div class="column is-full">
            <StatusProgress {...this.props.progress_bar} />
          </div>
          <div class="column is-full">
            <StatusBoardTable {...this.props.progress_status} />
          </div>
          <div class="column is-full prusa-job-buttons-tab">
            <div class="columns is-centered">
              <div class="column prusa-flex-no-grow">
                <button class="button has-background-grey prusa-job-button title is-size-3 is-size-5-desktop">
                  <img class="media-left image is-24x24" src={require("../../assets/exposure_times_color.svg")} />
                  <Text id={"project.change-exposure"}>change exposure times</Text>
                </button>
              </div>
              <div class="column prusa-flex-no-grow">
                <button class="button has-background-grey prusa-job-button title is-size-3 is-size-5-desktop">
                  <img class="media-left image is-24x24" src={require("../../assets/refill_color.svg")} />
                  <Text id={"project.refill-resin"}>refill resin</Text>
                </button>
              </div>
              <div class="column prusa-flex-no-grow">
                <button class="button has-background-success prusa-job-button title is-size-3 is-size-5-desktop">
                  <img class="media-left image is-24x24" src={require("../../assets/cancel.svg")} />
                  <Text id={"project.cancel-print"}>cancel print</Text>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}
