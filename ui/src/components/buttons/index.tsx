// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import "./style.scss";

let icons = icon_id => null;
if (process.env.IS_SL1) {
  const exp_times = require("../../assets/exposure_times_color.svg");
  const refill = require("../../assets/refill_color.svg");
  const yes = require("../../assets/yes_color.svg");
  const no = require("../../assets/cancel.svg");
  const del = require("../../assets/delete_small_white.svg");
  icons = function name(icon_id: string) {
    switch (icon_id) {
      case "exp-times":
        return exp_times;
      case "refill":
        return refill;
      case "yes":
        return yes;
      case "no":
        return no;
      case "del":
        return del;
      default:
        return null;
    }
  };
}

interface P {
  text: string;
  disabled?: boolean;
  onClick(e: MouseEvent): void;
  wrap?: boolean;
  className?: string;
}

interface PAction extends P {
  icon: string;
}

const Button: preact.FunctionalComponent<PAction> = ({
  text,
  disabled,
  onClick,
  wrap,
  icon,
  className
}) => {
  return (
    <button
      class={className + (wrap ? "prusa-button-margin" : "")}
      onClick={e => onClick(e)}
      disabled={disabled ? disabled : false}
    >
      <img class="media-left prusa-button-icon" src={icons(icon)} />
      {text}
    </button>
  );
};

export const YesButton: preact.FunctionalComponent<P> = ({
  className,
  ...others
}) => {
  const cls = "button prusa-button-yes " + (className ? className + " " : "");
  return Button({ ...others, icon: "yes", className: cls });
};

export const NoButton: preact.FunctionalComponent<P> = ({
  className,
  ...others
}) => {
  const cls = "button prusa-button-no " + (className ? className + " " : "");
  return Button({ ...others, icon: "no", className: cls });
};

export const ActionButton: preact.FunctionalComponent<PAction> = ({
  className,
  ...others
}) => {
  const cls =
    "button prusa-button-action " + (className ? className + " " : "");
  return Button({ ...others, className: cls });
};

export const DelButton: preact.FunctionalComponent<P> = ({
  className,
  ...others
}) => {
  const cls = "button prusa-button-no " + (className ? className + " " : "");
  return Button({ ...others, icon: "del", className: cls });
};
