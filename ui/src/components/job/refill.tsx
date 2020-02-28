// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component, Fragment } from 'preact';
import { Text } from 'preact-i18n';
import Title from "../title"
import YesNoView from "./yes-no"
import ExampleImage1 from "../../assets/refill.jpg";
import ExampleImage2 from "../../assets/tank.jpg";

interface P {
  onBack(e: Event): void;
}

class Refill extends Component<P, {}> {

  componentDidMount = () => {

    fetch('/api/job/material?value=start', {
      method: 'GET',
      headers: {
        "X-Api-Key": process.env.APIKEY,
      }
    }).then(function (response) {
      if (!response.ok) {
        throw Error(response.statusText);
      }
      return response;
    }).catch(e => {
      this.props.onBack(new Event("back"));
    });

  }

  onBack = (e: MouseEvent) => {

    fetch('/api/job/material?value=back', {
      method: 'GET',
      headers: {
        "X-Api-Key": process.env.APIKEY,
      }
    });
    this.props.onBack(e);
  }

  onYES = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    fetch('/api/job/material?value=continue', {
      method: 'GET',
      headers: {
        "X-Api-Key": process.env.APIKEY,
      }
    });
    this.props.onBack(e);

  }

  render() {
    return (
      <Fragment>
        <Title id="project.refill-resin" default_text="Refill resin" />
        <div class="columns is-multiline is-mobile is-centered is-vcentered">
          <div class="column is-full">
            <p class="title is-size-5 is-size-6-desktop">
              <Text id="project.please-refill">
                Please fully refill resin tank.
              </Text>
            </p>
          </div>
          <div class="column is-full">
            <div class="columns">
              <div class="column">
                <img src={ExampleImage1} />
              </div>
              <div class="column">
                <img src={ExampleImage2} />
              </div>
            </div>
          </div>
          <div class="column is-full">
            <YesNoView
              no_id="no"
              no_text="no"
              onNO={this.onBack}
              yes_id="resin-fully-refilled"
              yes_text="resin fully refilled"
              onYES={this.onYES}
            />
          </div>
        </div>
      </Fragment>
    );
  }
}

export default Refill;