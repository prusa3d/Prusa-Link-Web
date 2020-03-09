// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import { Text } from "preact-i18n";
import { numberFormat } from "../utils/format";

function formatUnit(unit: string) {
  return function newFormat(value: number) {
    return (value > -1 ? numberFormat(value) : "0") + unit;
  };
}

function addUnit(unit: string) {
  return function newFormat(value: number) {
    return value + unit;
  };
}

let title_icon = {};
if (process.env.PRINTER == "Original Prusa SL1") {
  const tem_svg = require("../../assets/temperature_color.svg");
  const fan_svg = require("../../assets/fan_color.svg");
  const formatCover = (value: string) => {
    return (
      <Text id={`status-left.cover_state_${value}`}>
        {value ? "Opened" : "Closed"}
      </Text>
    );
  };

  title_icon = {
    temp_cpu: {
      title: "CPU temperature",
      icon_scr: tem_svg,
      format: formatUnit(" °C")
    },
    temp_led: {
      title: "UV led temperature",
      icon_scr: tem_svg,
      format: formatUnit(" °C")
    },
    temp_amb: {
      title: "Ambient temperature",
      icon_scr: tem_svg,
      format: formatUnit(" °C")
    },
    uv_led_fan: {
      title: "UV LED fan",
      icon_scr: fan_svg,
      format: addUnit(" RPM")
    },
    blower_fan: {
      title: "Blower fan",
      icon_scr: fan_svg,
      format: addUnit(" RPM")
    },
    rear_fan: { title: "Rear fan", icon_scr: fan_svg, format: addUnit(" RPM") },
    cover_state: {
      title: "Cover state",
      icon_scr: require("../../assets/cover_color.svg"),
      format: formatCover
    }
  };
} else {
  title_icon = {
    temp_nozzle: {
      title: "Nozzle Temperature",
      icon_scr: require("../../assets/status_nozzle.svg"),
      format: formatUnit(" °C")
    },
    temp_bed: {
      title: "Heatbed",
      icon_scr: require("../../assets/status_heatbed.svg"),
      format: formatUnit(" °C")
    },
    printing_speed: {
      title: "Printing Speed",
      icon_scr: require("../../assets/status_prnspeed.svg"),
      format: formatUnit("%")
    },
    flow_factor: {
      title: "Printing Flow",
      icon_scr: require("../../assets/status_prnflow.svg"),
      format: numberFormat
    },
    pos_z_mm: {
      title: "Z-Height",
      icon_scr: require("../../assets/status_z_axis.svg"),
      format: formatUnit(" mm")
    },
    material: {
      title: "Material",
      icon_scr: require("../../assets/status_filament.svg"),
      format: null
    }
  };
}

interface S {
  type: string;
  value: string;
}

const StatusLeftItem: preact.FunctionalComponent<S> = props => {
  try {
    let { title, icon_scr, format } = title_icon[props.type];
    return (
      <div class="column is-half-touch is-full-desktop">
        <div class="media">
          <img class="media-left image is-24x24" src={icon_scr} />
          <div class="media-content is-clipped">
            <p class="prusa-default-text-grey">
              <Text id={`status-left.${props.type}`}>{title}</Text>
            </p>
            <p class="prusa-default-text">
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
