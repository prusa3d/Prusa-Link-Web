// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from 'preact';
import { StatusBoardTable, StatusBoardTableProps } from '../../components/status-board/board';
import { StatusProgress, StatusProgressProps } from "../../components/status-board/progress";
import { TempProps, Temperature } from "../../components/temperature";
import Title from "../../components/title"
import Welcome from "../../components/notification/welcome"

export interface homeProps extends TempProps {
  progress_bar: StatusProgressProps;
  progress_status: StatusBoardTableProps;
  showWelcome: boolean;
}

interface P extends homeProps{
  closeWelcome():void;
}

export const Home: preact.FunctionalComponent<P> = props => {
  return (
    <Fragment>
      <Title title="Printer status:" >
        {
          props.progress_bar.project_name == "" 
          ? <span class="title is-size-3 is-size-4-desktop"> Idle</span>
          : <span class="title is-size-3 is-size-4-desktop prusa-text-orange"> Priting</span>
        }
      </Title>
      <Welcome show={props.showWelcome} close={props.closeWelcome} />
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


