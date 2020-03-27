// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import { Translation } from "react-i18next";
import Title from "../../components/title";
import Welcome from "../../components/notification/welcome";
import StatusBoard from "../../components/status-board";
import { TempProps, Temperature } from "../../components/temperature";
import Upload from "../../components/upload";
import { isPrinting } from "../../components/utils/states";
import { PrinterState } from "../../components/telemetry";

interface homeProps extends TempProps {
  printer_state: PrinterState;
}

const Home: preact.FunctionalComponent<homeProps> = ({
  printer_state,
  temperatures
}) => {
  return (
    <Fragment>
      {/* 
      // @ts-ignore */}
      <Translation useSuspense={false}>
        {(t, { i18n }, ready) =>
          ready && (
            <Title title={t("home.title") + ": "}>
              {
                <span class="prusa-title prusa-text-orange">
                  {isPrinting(printer_state)
                    ? t("prop.st-priting")
                    : t("prop.st-idle")}
                </span>
              }
            </Title>
          )
        }
      </Translation>
      <Welcome />
      <div class="columns is-multiline">
        <StatusBoard printer_state={printer_state} />
        <div class="column is-full-touch is-half-desktop">
          <Upload />
        </div>
        <div class="column is-full-touch is-half-desktop">
          <Temperature temperatures={temperatures} bigSize={false} />
        </div>
      </div>
    </Fragment>
  );
};

export default Home;
