// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import Welcome from "../../components/notification/welcome";
import {
  StatusBoardMini,
  StatusBoardTableProps
} from "../../components/status-board/board";
import {
  StatusProgress,
  StatusProgressProps
} from "../../components/status-board/progress";
import { TempProps, Temperature } from "../../components/temperature";
import Upload from "../../components/upload";

export interface homeProps extends TempProps {
  progress_bar: StatusProgressProps;
  progress_status: StatusBoardTableProps;
}

interface Props extends homeProps {
  readonly Intl: object;
}

export const Home: preact.FunctionalComponent<Props> = props => {
  const translations = props.Intl["home"];
  return (
    <Fragment>
      <div class="title is-size-3 is-size-4-desktop has-text-white">
        {translations["title"]}
        {props.progress_bar.project_name == "" ? (
          <span class="title is-size-3 is-size-4-desktop has-text-white">
            {" "}
            {translations["status-idle"]}
          </span>
        ) : (
          <span class="title is-size-3 is-size-4-desktop prusa-text-orange">
            {" "}
            {translations["status-priting"]}
          </span>
        )}
      </div>
      <Welcome Intl={props.Intl} />
      <div class="columns is-desktop is-centered">
        <div class="column">
          <StatusProgress {...props.progress_bar} />
          <br />
          <Upload url={null} path={null} />
        </div>
        <div class="column">
          <StatusBoardMini {...props.progress_status} Intl={props.Intl} />
        </div>
      </div>
      <div class="columns is-multiline is-mobile">
        <div class="column is-full">
          <Temperature
            temperatures={props.temperatures}
            bigSize={false}
            Intl={props.Intl["temperature"]}
          />
        </div>
      </div>
    </Fragment>
  );
};
