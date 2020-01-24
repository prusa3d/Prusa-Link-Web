// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from 'preact';
import { Text } from 'preact-i18n';
import { StatusBoardTable, StatusBoardTableProps } from '../../components/status-board/board';
import { StatusProgress, StatusProgressProps } from "../../components/status-board/progress";
import { TempProps, Temperature } from "../../components/temperature";
import "./style.scss";

export interface homeProps extends TempProps {
  progress_bar: StatusProgressProps;
  progress_status: StatusBoardTableProps;

}

export const Home: preact.FunctionalComponent<homeProps> = props => {
  return (
    <Fragment>
      <div class="box has-background-black is-paddingless">
        <p class="title is-size-2 is-size-5-desktop prusa-text-orange prusa-line">
          {process.env.PRINTER}
          <span class="subtitle title is-size-3 is-size-6-desktop has-text-grey">
            <Text id="home.subtitle">printer status</Text>
          </span>
        </p>
      </div>
      <div class="columns is-desktop is-centered">
        <div class="column">
          <StatusProgress {...props.progress_bar} />
          <br />
          <Temperature temperatures={props.temperatures} bigSize={false} />
        </div>
        <div class="column">
          <StatusBoardTable {...props.progress_status} />
        </div>
      </div>
    </Fragment>
  );
};


