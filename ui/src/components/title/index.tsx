// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";

interface P {
  title: string;
  children?: any;
}

interface S {
  hostname: string;
}

class Title extends Component<P, S> {
  state = { hostname: null };

  componentDidMount = () => {
    fetch("/api/properties?values=hostname", {
      method: "GET",
      headers: {
        "X-Api-Key": process.env.APIKEY,
        Accept: "application/json"
      }
    })
      .then(response => response.json())
      .then(data => {
        this.setState({ hostname: data.hostname });
      });
  };

  render({ title, children }, { hostname }) {
    return (
      <div class="box has-background-black is-paddingless prusa-line">
        <div class="columns is-centered">
          <div class="column prusa-title prusa-break-word">
            {title}
            {children && children}
          </div>
          <div class="column has-text-right prusa-title">
            <p>
              hostname: <span class="prusa-text-orange">{hostname}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }
}

export default Title;
