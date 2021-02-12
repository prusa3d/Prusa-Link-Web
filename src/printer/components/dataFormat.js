// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const formatData = (format, value) => {
  if (process.env.PRINTER_FAMILY == "sla") {
    return slaFormatData(format, value);
  } else {
    return fdmFormatData(format, value);
  }
};

function numberFormat(value) {
  if (value > 0) {
    return value.toFixed(1);
  } else {
    return 0;
  }
}

function dateFormat(value) {
  const date = new Date(value);
  const dateFormatted = date.toDateString() + " " + date.toTimeString();
  return dateFormatted.substring(0, 25);
}

function formatEstimatedTime({ remaining_time, offset }) {
  let estimated_end = "00:00";
  if (remaining_time && offset) {
    var time_zone = 0;
    if (offset) {
      var time_zone =
        parseInt(`${offset.substring(0, 1)}1`) *
        (parseInt(offset.substring(1, 3)) * 3600000 +
          parseInt(`0${offset.substring(3)}`) * 60000);
    }
    let now = new Date(new Date().getTime() + time_zone);
    let end = new Date(now.getTime() + remaining_time);
    let tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let plus_days = "";
    if (
      end.getUTCDate() == now.getUTCDate() &&
      end.getUTCMonth() == now.getUTCMonth()
    ) {
      plus_days = "today at ";
    } else if (
      end.getUTCDate() == tomorrow.getUTCDate() &&
      end.getUTCMonth() == tomorrow.getUTCMonth()
    ) {
      plus_days = "tomorrow at ";
    } else {
      let options = { month: "numeric", day: "numeric", timeZone: "UTC" };
      const final_date = end.toLocaleString(window.navigator.language, options);
      plus_days = `${final_date} at `;
    }

    estimated_end =
      plus_days +
      ("0" + end.getUTCHours()).substr(-2) +
      ":" +
      ("0" + end.getUTCMinutes()).substr(-2);
  }
  return estimated_end;
}

function formatTime(value) {
  if (value < 60) {
    return "Less than a minute";
  }
  const minutes = Math.floor((value / 60) % 60);
  const hours = Math.floor((value / 3600) % 24);
  if (hours > 0) {
    return hours + " h" + (minutes > 0 ? ` ${minutes} min` : "");
  }
  return minutes + " minute" + (minutes > 1 ? "s" : "");
}

function formatExposure(expo) {
  if (
    expo.exposureTimeFirst == undefined ||
    expo.exposureTime == undefined ||
    expo.exposureTimeCalibration == undefined
  ) {
    return "NA";
  }
  return `${numberFormat(expo.exposureTimeFirst / 1000)}/${numberFormat(
    expo.exposureTime / 1000
  )}/${numberFormat(expo.exposureTimeCalibration / 1000)} s`;
}

const slaFormatData = (format, value) => {
  if (value === undefined) {
    return "NA";
  }

  switch (format) {
    case "int":
      return parseInt(value);
    case "number":
      return numberFormat(value);
    case "layer":
      return numberFormat(value) + " mm";
    case "temp":
      return numberFormat(value) + " °C";
    case "fan":
      return numberFormat(value) + " RPM";
    case "cover":
      return value ? "Opened" : "Closed";
    case "date":
      return dateFormat(value);
    case "dateOffset":
      return formatEstimatedTime(value);
    case "time":
      return formatTime(value);
    case "expo":
      return formatExposure(value);
    default:
      return value;
  }
};

const fdmFormatData = (format, value) => {
  if (value === undefined) {
    return "NA";
  }

  switch (format) {
    case "number":
      return numberFormat(value);
    case "temp":
      return numberFormat(value) + " °C";
    case "fan":
      return numberFormat(value) + " RPM";
    case "print":
      return numberFormat(value) + " mm/s";
    case "date":
      return dateFormat(value);
    case "dateOffset":
      return formatEstimatedTime(value);
    default:
      return value;
  }
};

export default formatData;
