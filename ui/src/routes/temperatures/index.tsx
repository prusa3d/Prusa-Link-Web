// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import Title from "../../components/title";
import { TempProps, Temperature } from "../../components/temperature";

interface P extends TempProps {
  Intl: object;
}

const Temperatures: preact.FunctionalComponent<P> = props => {
  const translations = props.Intl["temperature"];
  return (
    <Fragment>
      <Title text={translations["title"]} />
      <div class="columns is-centered">
        <div class="column is-full">
          <Temperature
            temperatures={props.temperatures}
            bigSize={true}
            Intl={translations}
          />
        </div>
      </div>
    </Fragment>
  );
};

export default Temperatures;
