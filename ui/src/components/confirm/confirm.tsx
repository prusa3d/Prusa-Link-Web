// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component, Fragment } from "preact";
import { Text } from "preact-i18n";
import { PrinterState } from "../telemetry";
import Title from "../title";
import { formatTime } from "../utils/format";

interface P {
  printer_state: PrinterState;
  onclick(nextShow: number): void;
}

interface S {
  disabled: boolean;
  exposure_times: string;
  last_modified: string;
  layer_height_mm: string;
  project_name: string;
  remaining_time: string;
  total_layers: number;
}

class Confirm extends Component<P, S> {
  state = {
    disabled: false,
    exposure_times: null,
    last_modified: null,
    layer_height_mm: null,
    project_name: null,
    remaining_time: null,
    total_layers: null
  };

  componentDidMount = () => {
    fetch("/api/before-confirm", {
      method: "GET",
      headers: {
        "X-Api-Key": process.env.APIKEY,
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    })
      .then(response => response.json())
      .then(data => {
        const dt = new Date(data.last_modified);
        const last_modified = dt.toDateString() + " " + dt.toTimeString();
        const result = {
          exposure_times: data.exposure_times,
          last_modified: last_modified.substring(0, 25),
          layer_height_mm: data.layer_height_mm,
          project_name: data.project_name,
          remaining_time: formatTime(data.remaining_time, "NA", "NA"),
          total_layers: data.total_layers
        };

        this.setState(prevState => ({ ...prevState, ...result }));
      });
  };

  onCancel = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const that = this;
    fetch("/api/job", {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.APIKEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        command: "cancel"
      })
    }).then(function(response) {
      if (response.ok) {
        that.setState(prevState => ({ ...prevState, disabled: true }));
      }
      return response;
    });
  };

  onConfirm = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const that = this;
    fetch("/api/job", {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.APIKEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        command: "start"
      })
    }).then(function(response) {
      if (response.ok) {
        that.setState(prevState => ({ ...prevState, disabled: true }));
      }
      return response;
    });
  };

  onChangeExposure = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    this.props.onclick(1);
  };

  render(props, states) {
    return (
      <Fragment>
        <Title id="project.title" default_text="Project files" />
        <div class="columns is-multiline is-mobile is-centered is-vcentered">
          <div class="column is-full">
            <p class="prusa-default-text has-text-centered prusa-confirm-question">
              <Text id="project.please-fill-resin">
                Please fill the resin tank and close the cover.
              </Text>
            </p>
          </div>
          <div class="column is-full">
            <p class="title is-size-3 is-size-4-desktop">
              {states.project_name && states.project_name}
            </p>
          </div>
          <div class="column is-full">
            <div class="columns">
              <div class="column">
                <p class="prusa-default-text-grey">
                  <Text id={"status-board.layer"}>Layers</Text>
                </p>
                <p class="prusa-default-text">
                  {states.total_layers && states.total_layers}
                </p>
              </div>
              <div class="column">
                <p class="prusa-default-text-grey">
                  <Text id={"project.leyer-height"}>Layers height</Text>
                </p>
                <p class="prusa-default-text">
                  {states.layer_height_mm && states.layer_height_mm}
                </p>
              </div>
            </div>
            <div class="columns">
              <div class="column">
                <p class="prusa-default-text-grey">
                  <Text id={"project.Exposure-times"}>Exposure times</Text>
                </p>
                <p class="prusa-default-text">
                  {states.exposure_times && states.exposure_times}
                </p>
              </div>
              <div class="column">
                <p class="prusa-default-text-grey">
                  <Text id={"project.print-time-estimate"}>
                    Print time estimate
                  </Text>
                </p>
                <p class="prusa-default-text">
                  {states.remaining_time && states.remaining_time}
                </p>
              </div>
            </div>
            <div class="columns">
              <div class="column">
                <p class="prusa-default-text-grey">
                  <Text id={"project.last-modified"}>Last modified</Text>
                </p>
                <p class="prusa-default-text">
                  {states.last_modified && states.last_modified}
                </p>
              </div>
            </div>
          </div>
          <div class="column is-full">
            <div class="prusa-is-flex-end">
              <button
                class="button prusa-button-confirm prusa-default-text"
                onClick={e => this.onConfirm(e)}
                disabled={states.disabled}
              >
                <Text id="project.start_print">Start print</Text>
              </button>
              <button
                class="button prusa-button-grey prusa-default-text"
                onClick={e => this.onChangeExposure(e)}
                disabled={states.disabled}
              >
                <img
                  class="media-left image is-24x24"
                  src={require("../../assets/exposure_times_color.svg")}
                />
                <Text id={"project.change-exposure"}>
                  Change exposure times
                </Text>
              </button>
              <button
                class="button prusa-button-cancel prusa-default-text"
                onClick={e => this.onCancel(e)}
                disabled={states.disabled}
              >
                <img
                  class="media-left image is-24x24"
                  src={require("../../assets/cancel.svg")}
                />
                <Text id="questions.cancel">Cancel</Text>
              </button>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default Confirm;
