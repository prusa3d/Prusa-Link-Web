// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import Title from "../../components/title";
import { TempProps, Temperature } from "../../components/temperature";
import { useTranslation } from "react-i18next";

const Temperatures: preact.FunctionalComponent<TempProps> = props => {
  const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
  return (
    ready && (
      <Fragment>
        <Title title={t("temps.title")} />
        <div class="columns is-centered">
          <div class="column is-full">
            <Temperature temperatures={props.temperatures} bigSize={true} />
          </div>
        </div>
      </Fragment>
    )
  );
};

export default Temperatures;
