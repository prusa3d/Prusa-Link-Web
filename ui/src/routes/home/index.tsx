// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import { Text } from "preact-i18n";
import Title from "../../components/title";
import Welcome from "../../components/notification/welcome";
import StatusBoard from "../../components/status-board";
import { TempProps, Temperature } from "../../components/temperature";
import Upload from "../../components/upload";

interface homeProps extends TempProps {
  isPrinting: boolean;
}

const Home: preact.FunctionalComponent<homeProps> = ({
  isPrinting,
  temperatures
}) => {
  return (
    <Fragment>
      <Title id="home.title" default_text="Printer status:">
        {isPrinting ? (
          <span class="title is-size-3 is-size-4-desktop prusa-text-orange">
            {" "}
            <Text id="home.status-priting">Priting</Text>
          </span>
        ) : (
          <span class="title is-size-3 is-size-4-desktop has-text-white">
            {" "}
            <Text id="home.status-idle">Idle</Text>
          </span>
        )}
      </Title>
      <Welcome />
      <div class="columns is-multiline">
        <StatusBoard isPrinting={isPrinting} />
        <div class="column is-full-touch is-half-desktop">
          <Upload url={null} path={null} />
        </div>
      </div>
      <div class="columns is-multiline is-mobile">
        <div class="column is-full">
          <Temperature temperatures={temperatures} bigSize={false} />
        </div>
      </div>
    </Fragment>
  );
};

export default Home;
