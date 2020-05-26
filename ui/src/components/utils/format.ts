// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

export function numberFormat(value: number) {
  if (value > 0) {
    return value.toFixed(1);
  } else {
    return 0;
  }
}

export function formatTime(
  value: number,
  t: (text: string, other?: any) => string
): string {
  if (value) {
    if (value < 60000) {
      return t("prop.less-than");
    }
    const minutes = Math.floor((value / 60000) % 60);
    const hours = Math.floor((value / 3600000) % 24);
    if (hours > 0) {
      return (
        hours +
        " " +
        t("unit.h") +
        (minutes > 0 ? ` ${minutes} ${t("unit.min")}` : "")
      );
    }
    if (minutes > 0) {
      return minutes + " " + t("unit.minute", { count: minutes });
    }
  } else {
    return t("prop.na");
  }
}

export function formatEstimatedTime(
  value: number,
  t: (text: string) => string
): string {
  if (value) {
    let now = new Date();
    let end = new Date(now.getTime() + value);
    const days = Math.abs(end.getDate() - now.getDate());
    let plus_days = "";
    if (days == 1) {
      plus_days = t("prop.tmw") + " ";
    } else if (days > 1) {
      plus_days = `${days} ${t("prop.d+")} `;
    }
    return (
      plus_days +
      (("0" + end.getHours()).substr(-2) +
        ":" +
        ("0" + end.getMinutes()).substr(-2))
    );
  } else {
    return "00:00";
  }
}

export function available(value: number | string, unit: string = null) {
  return value ? value + (unit ? " " + unit : "") : "NA";
}
