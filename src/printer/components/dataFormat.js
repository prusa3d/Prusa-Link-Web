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

function formatEstimatedTime(time) {
  let estimated_end = "00:00";
  if (time) {
    let now = new Date();
    let end = new Date(now.getTime() + time * 1000);
    let tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let plus_days = "";
    if (end.getDate() == now.getDate() && end.getMonth() == now.getMonth()) {
      plus_days = "today at ";
    } else if (
      end.getDate() == tomorrow.getDate() &&
      end.getMonth() == tomorrow.getMonth()
    ) {
      plus_days = "tomorrow at ";
    } else {
      let options = { month: "numeric", day: "numeric" };
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
    case "resin":
      return numberFormat(value) + " ml";
    case "cover":
      return value ? "Opened" : "Closed";
    case "date":
      return dateFormat(value);
    case "progress":
      return numberFormat(value * 100) + "%";
    case "timeEst":
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
    case "pos":
      return numberFormat(value) + " mm";
    case "date":
      return dateFormat(value);
    case "time":
      return formatTime(value);
    case "timeEst":
      return formatEstimatedTime(value);
    case "progress":
      return numberFormat(value * 100) + "%";
    default:
      return value;
  }
};

export default formatData;
