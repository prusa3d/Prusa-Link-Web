// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from 'preact';

let title_icon: { [id: string]: { title: string, icon_scr: string } } = {};
if (process.env.PRINTER == "Original Prusa SL1") {

  const tem_svg = require("../../assets/temperature_color.svg");
  const fan_svg = require("../../assets/fan_color.svg");
  title_icon = {
    temp_cpu: { title: "CPU temperature", icon_scr: tem_svg },
    temp_led: { title: "UV led temperature", icon_scr: tem_svg },
    temp_amb: { title: "ambient temperature", icon_scr: tem_svg },
    uv_led_fan: { title: "UV LED fan", icon_scr: fan_svg },
    blower_fan: { title: "blower fan", icon_scr: fan_svg },
    rear_fan: { title: "rear fan", icon_scr: fan_svg },
    cover_state: { title: "cover state", icon_scr: require("../../assets/cover_color.svg") },
  };

} else {
  title_icon = {
    nozzle: { title: "Nozzle Temperature", icon_scr: require("../../assets/status_nozzle.svg") },
    heatbed: { title: "Heatbed", icon_scr: require("../../assets/status_heatbed.svg") },
    speed: { title: "Printing Speed", icon_scr: require("../../assets/status_prnspeed.svg") },
    flow: { title: "Printing Flow", icon_scr: require("../../assets/status_prnflow.svg") },
    height: { title: "Z-Height", icon_scr: require("../../assets/status_z_axis.svg") },
    material: { title: "Material", icon_scr: require("../../assets/status_filament.svg") }
  };

}

interface S {
  type: string,
  value: string
};

const StatusLeftItem: preact.FunctionalComponent<S> = props => {
  let { title, icon_scr } = title_icon[props.type];

  return (
    <div
      class="column is-half-touch is-full-desktop"
    >
      <div class="media">
        <img class="media-left image is-24x24" src={icon_scr} />
        <div class="media-content is-clipped">
          <p class="subtitle is-size-3 is-size-5-desktop has-text-grey">
            {title}
          </p>
          <p class="title is-size-2 is-size-5-desktop has-text-white">
            {props.value}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatusLeftItem;