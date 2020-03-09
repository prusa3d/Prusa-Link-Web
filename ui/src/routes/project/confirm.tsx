// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import { Text } from "preact-i18n";
import { PrinterState } from "../../components/telemetry";
import Title from "../../components/title";

interface P {
  printer_state: PrinterState;
}

const ConfirmPrint: preact.FunctionalComponent<P> = ({ printer_state }) => {
  return (
    <Fragment>
      <Title id="project.title" default_text="Project files" />
      <div class="columns is-multiline is-mobile is-centered is-vcentered">
        <div class="column is-full">
          <p class="prusa-default-text has-text-centered prusa-confirm-question">
            <Text id="project.cancel-print-question">
              Please fill the resin tank and close the cover.
            </Text>
          </p>
        </div>
        <div class="column is-full">
          <p class="title is-size-3 is-size-4-desktop">
            File_name_big_name_here_1321321321321dfcvxcvzxcvzxcvzxcasdfasdfashdsvbv32132132.sla
          </p>
        </div>
        <div class="column is-full">
          <div class="columns">
            <div class="column">
              <p class="prusa-default-text-grey">Layers</p>
              <p class="prusa-default-text">247</p>
            </div>
            <div class="column">
              <p class="prusa-default-text-grey">Layers height</p>
              <p class="prusa-default-text">247</p>
            </div>
          </div>
          <div class="columns">
            <div class="column">
              <p class="prusa-default-text-grey">Exposure times</p>
              <p class="prusa-default-text">247</p>
            </div>
            <div class="column">
              <p class="prusa-default-text-grey">Print time estimate</p>
              <p class="prusa-default-text">12h</p>
            </div>
          </div>
          <div class="columns">
            <div class="column">
              <p class="prusa-default-text-grey">Last modified</p>
              <p class="prusa-default-text">Tue Oct 8 2019 09:08:12</p>
            </div>
          </div>
        </div>
        <div class="column is-full">
          <div class="prusa-is-flex-end">
            <button class="button prusa-button-confirm prusa-default-text">
              <Text id="project.start_print">START PRINT</Text>
            </button>
            <button class="button prusa-button-grey prusa-default-text">
              <img
                class="media-left image is-24x24"
                src={require("../../assets/exposure_times_color.svg")}
              />
              <Text id={"project.change-exposure"}>Change exposure times</Text>
            </button>
            <button class="button prusa-button-cancel prusa-default-text">
              <img
                class="media-left image is-24x24"
                src={require("../../assets/cancel.svg")}
              />
              <Text id="questions.cancel">cancel</Text>
            </button>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default ConfirmPrint;
