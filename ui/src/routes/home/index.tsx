// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import { useTranslation } from "react-i18next";
import Title from "../../components/title";
import Welcome from "../../components/notification/welcome";
import Progress from "../../components/progress";
import { TempProps, Temperature } from "../../components/temperature";
import Upload from "../../components/upload";
import { isPrinting } from "../../components/utils/states";
import { PrinterState } from "../../components/telemetry";

interface homeProps extends TempProps {
  printer_state: PrinterState;
}

const Contents = props => (
  <Fragment>
    <div class="column is-full-touch is-half-desktop">
      <Upload />
    </div>
    <div class="column is-full-touch is-half-desktop">
      <Temperature temperatures={props.temperatures} />
    </div>
  </Fragment>
);

const ViewProgress = props => (
  <div class="column is-full">
    <Progress printer_state={props.printer_state} isHalf>
      <Contents temperatures={props.temperatures} />
    </Progress>
  </div>
);

const ViewDefault = props => {
  const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
  return (
    <Fragment>
      <div class="column is-full">
        {ready && (
          <Title title={t("home.title") + ": "}>
            <span class="prusa-title prusa-text-white">
              {t("prop.st-idle")}
            </span>
          </Title>
        )}
      </div>
      <Contents temperatures={props.temperatures} />
    </Fragment>
  );
};

const Home: preact.FunctionalComponent<homeProps> = props => {
  return (
    <div class="columns is-multiline">
      <Welcome />
      {isPrinting(props.printer_state) ? (
        <ViewProgress {...props} />
      ) : (
        <ViewDefault {...props} />
      )}
    </div>
  );
};

export default Home;
