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
  remaining_time: number,
  time_zone: number,
  t: (text: string) => string
): string {
  let estimated_end = "00:00";
  if (remaining_time) {
    let now = new Date(new Date().getTime() + time_zone * 3600000);
    let end = new Date(now.getTime() + remaining_time);
    let tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let plus_days = "";
    if (
      end.getUTCDate() == now.getUTCDate() &&
      end.getUTCMonth() == now.getUTCMonth()
    ) {
      plus_days = t("prop.today-at") + " ";
    } else if (
      end.getUTCDate() == tomorrow.getUTCDate() &&
      end.getUTCMonth() == tomorrow.getUTCMonth()
    ) {
      plus_days = t("prop.tmw-at") + " ";
    } else {
      let options = { month: "numeric", day: "numeric", timeZone: "UTC" };
      const final_date = end.toLocaleString(window.navigator.language, options);
      plus_days = `${final_date} ${t("prop.at")} `;
    }

    estimated_end =
      plus_days +
      ("0" + end.getUTCHours()).substr(-2) +
      ":" +
      ("0" + end.getUTCMinutes()).substr(-2);
  }
  return estimated_end;
}

export function available(value: number | string, unit: string = null) {
  return value ? value + (unit ? " " + unit : "") : "NA";
}
