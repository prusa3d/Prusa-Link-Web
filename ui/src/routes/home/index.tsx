// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from 'preact';
import { Text } from 'preact-i18n';
import Title from "../../components/title"
import Welcome from "../../components/notification/welcome"
import { StatusBoardTable, StatusBoardTableProps } from '../../components/status-board/board';
import { StatusProgress, StatusProgressProps } from "../../components/status-board/progress";
import { TempProps, Temperature } from "../../components/temperature";

let Upload;
if (process.env.PRINTER != "Original Prusa Mini") {
  Upload = require("../../components/upload");
}

export interface homeProps extends TempProps {
  progress_bar: StatusProgressProps;
  progress_status: StatusBoardTableProps;
}

export const Home: preact.FunctionalComponent<homeProps> = props => {
  return (
    <Fragment>
      <Title id="home.title" default_text="Printer status:" >
        {
          props.progress_bar.project_name == ""
            ? <span class="title is-size-3 is-size-4-desktop has-text-white"> <Text id="home.status-idle">Idle</Text></span>
            : <span class="title is-size-3 is-size-4-desktop prusa-text-orange"> <Text id="home.status-priting">Priting</Text></span>
        }
      </Title>
      <Welcome />
      <div class="columns is-desktop is-centered">
        <div class="column">
          <StatusProgress {...props.progress_bar} />
          <br />
          {
            process.env.PRINTER != "Original Prusa Mini" &&
            <Upload url={null} path={null} />
          }
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


