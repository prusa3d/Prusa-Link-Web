// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
// import { Text } from "preact-i18n";
import { numberFormat } from "../utils/index";

function formatUnit(unit: string) {
  return function newFormat(value: number) {
    return (value > -1 ? numberFormat(value) : "0") + unit;
  };
}

let title_icon = {
  temp_nozzle: {
    icon_scr: require("../../assets/status_nozzle.svg"),
    format: formatUnit(" °C")
  },
  temp_bed: {
    icon_scr: require("../../assets/status_heatbed.svg"),
    format: formatUnit(" °C")
  },
  material: {
    icon_scr: require("../../assets/status_filament.svg"),
    format: null
  }
};

interface S {
  type: string;
  value: string;
  readonly Intl: object;
}

const StatusLeftItem: preact.FunctionalComponent<S> = props => {
  try {
    let { title, icon_scr, format } = title_icon[props.type];
    return (
      <div class="column is-half-touch is-full-desktop">
        <div class="media">
          <img class="media-left image is-24x24" src={icon_scr} />
          <div class="media-content is-clipped">
            <p class="subtitle is-size-3 is-size-5-desktop has-text-grey">
              {props.Intl[props.type]}
            </p>
            <p class="title is-size-2 is-size-5-desktop has-text-white">
              {format ? format(props.value) : props.value}
            </p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.log(`${props.type} is not defined.`);
    return <div />;
  }
};

export default StatusLeftItem;
