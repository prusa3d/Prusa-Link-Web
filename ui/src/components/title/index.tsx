// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";
import { useTranslation } from "react-i18next";

import { network } from "../utils/network";

interface P extends network {
  title: string;
  children?: any;
}

interface S {
  hostname: string;
}

class Title extends Component<P, S> {
  state = { hostname: null };

  componentDidMount = () => {
    this.props.onFetch({
      url: "/api/hostname",
      then: response =>
        response.json().then(data => {
          this.setState({ hostname: data.hostname });
        })
    });
  };

  render({ title, children, onFetch }, { hostname }) {
    const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
    return (
      <div class="box has-background-black is-paddingless prusa-line">
        <div class="columns is-centered">
          <div class="column txt-normal txt-size-1 txt-grey prusa-break-word">
            {title}
            {children && children}
          </div>
          <div class="column has-text-right txt-normal txt-size-1 prusa-preserve">
            {hostname && ready && (
              <p class="txt-grey">
                {t("glob.hostname")}: <span class="txt-orange">{hostname}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default Title;
