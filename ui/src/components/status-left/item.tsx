// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";

let icons = icon_id => null;
if (process.env.IS_SL1) {
  const tem_svg = require("../../assets/temperature_color.svg");
  const fan_svg = require("../../assets/fan_color.svg");
  const cover_svg = require("../../assets/cover_color.svg");

  icons = function name(icon_id: string) {
    switch (icon_id) {
      case "temp":
        return tem_svg;
      case "fan":
        return fan_svg;
      case "cover":
        return cover_svg;
      default:
        return null;
    }
  };
} else {
  const nozzle_svg = require("../../assets/status_nozzle.svg");
  const bed_svg = require("../../assets/status_heatbed.svg");
  const mtl_svg = require("../../assets/status_filament.svg");

  icons = function name(icon_id: string) {
    switch (icon_id) {
      case "nozzle":
        return nozzle_svg;
      case "bed":
        return bed_svg;
      case "mtl":
        return mtl_svg;
      default:
        return null;
    }
  };
}

interface S {
  icon_id: string;
  name: string;
  value: any;
}

const StatusLeftItem: preact.FunctionalComponent<S> = ({
  icon_id,
  name,
  value
}) => {
  return (
    <div class="column is-half-touch is-full-desktop">
      <div class="media media-hd-status">
        <img class="media-left icon-hd-status" src={icons(icon_id)} />
        <div class="media-content is-clipped">
          <p class="txt-normal txt-size-2 txt-grey">{name}</p>
          <p class="txt-bold txt-size-2">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default StatusLeftItem;
