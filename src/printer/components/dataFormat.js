// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { translate } from "../../locale_provider";

// TODO: translate more units - mm, s, ...
const str_at = translate("prop.at");
const str_h = translate("unit.h");
const str_less_than_a_minute = translate("prop.less-than");
const str_min = translate("unit.min");
const str_minute = translate("unit.minute");
const str_minute_plural = translate("unit.minute_plural");
const str_ml = translate("unit.ml");
const str_rpm = translate("unit.rpm");
const str_today_at = translate("prop.today-at");
const str_tomorow_at = translate("prop.tmw-at");

/**
 * Format the value data with format specificated.
 * @param {string} format - one of ["int", "number", "layer", "temp", "fan", "resin", "cover", "date", "progress", "timeEst", "time", "expo"]
 * @param {any} value
 */
const formatData = (format, value) => {
  if (process.env.PRINTER_FAMILY == "sla") {
    return slaFormatData(format, value);
  } else {
    return fdmFormatData(format, value);
  }
};

/**
 * It formats a number using fixed-point notation with one digit after the decimal point.
 * ex: 123.456 => 123.4
 * @param {number} value
 */
function numberFormat(value) {
  if (value > 0) {
    return value.toFixed(1);
  } else {
    return 0;
  }
}

/**
 * Return a string with date and time formatted
 * @param {number} value
 */
function dateFormat(value) {
  const date = new Date(value * 1000);
  const dateFormatted = date.toDateString() + " " + date.toTimeString();
  return dateFormatted.substring(0, 25);
}

/**
 * return the estimated time from current time + seconds (time)
 * @param {number} time
 */
function formatEstimatedTime(time) {
  let estimated_end = "00:00";
  if (time) {
    let now = new Date();
    const timezoneOffset = -now.getTimezoneOffset() * 60000;
    let end = new Date(now.getTime() + time * 1000 + timezoneOffset);
    let tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let plus_days = "";
    if (
      end.getUTCDate() == now.getUTCDate() &&
      end.getUTCMonth() == now.getUTCMonth()
    ) {
      plus_days = `${str_today_at} `;
    } else if (
      end.getUTCDate() == tomorrow.getUTCDate() &&
      end.getUTCMonth() == tomorrow.getUTCMonth()
    ) {
      plus_days = `${str_tomorow_at} `;
    } else {
      let options = { month: "numeric", day: "numeric", timeZone: "UTC" };
      const final_date = end.toLocaleString(window.navigator.language, options);
      plus_days = `${final_date} ${str_at} `;
    }

    estimated_end =
      plus_days +
      ("0" + end.getUTCHours()).substr(-2) +
      ":" +
      ("0" + end.getUTCMinutes()).substr(-2);
  }
  return estimated_end;
}

/**
 * convert seconds in hh:mm
 * @param {number} value
 */
function formatTime(value) {
  if (value < 60) {
    return str_less_than_a_minute;
  }
  const minutes = Math.floor((value / 60) % 60);
  const hours = Math.floor(value / 3600);
  if (hours > 0) {
    return hours + ` ${str_h}` + (minutes > 0 ? ` ${minutes} ${str_min}` : "");
    // return hours + " h" + (minutes > 0 ? ` ${minutes} min` : "");
  }
  return minutes + " " + (minutes > 1 ? str_minute_plural : str_minute);
  // return minutes + " minute" + (minutes > 1 ? "s" : "");
}

/**
 * Return exposureTimeFirst/exposureTime/exposureTimeCalibration in milliseconds
 * @param {object} expo
 */
function formatExposure(expo) {
  if (expo.exposureTimeFirst == undefined || expo.exposureTime == undefined) {
    return translate("prop.na");
  }
  let expo_times = `${numberFormat(
    expo.exposureTimeFirst / 1000
  )}/${numberFormat(expo.exposureTime / 1000)}/${numberFormat(
    expo.exposureUserProfile
  )}`;
  if (expo.exposureTimeCalibration !== undefined) {
    expo_times = `${expo_times}/${numberFormat(
      expo.exposureTimeCalibration / 1000
    )}`;
  }
  return expo_times + " s";
}

function totalLayers(data) {
  const currentLayer = data.progress.currentLayer;
  const layers = data.job.file.layers;
  if (currentLayer == undefined || layers == undefined) {
    return translate("prop.na");
  }
  return `${currentLayer}/${layers}`;
}

/**
 * Format the value data with format specificated for sla family.
 * @param {string} format - one of ["int", "number", "layer", "temp", "fan", "resin", "cover", "date", "progress", "timeEst", "time", "expo"]
 * @param {any} value
 */
const slaFormatData = (format, value) => {
  if (value === undefined) {
    return translate("prop.na");
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
      return numberFormat(value) + ` ${str_rpm}`;
    case "resin":
      return numberFormat(value) + ` ${str_ml}`;
    case "cover":
      return value
        ? translate("prop.cover-closed")
        : translate("prop.cover-opened");
    case "date":
      return dateFormat(value);
    case "progress":
      return numberFormat(value * 100) + " %";
    case "timeEst":
      return formatEstimatedTime(value);
    case "time":
      return formatTime(value);
    case "est-time":
      return "~ " + formatTime(value);
    case "expo":
      return formatExposure(value);
    case "totalLayer":
      return totalLayers(value);
    default:
      return value;
  }
};

/**
 * Format the value data with format specificated for fdm family.
 * @param {string} format - one of ["number", "temp", "fan", "pos", "date", "progress", "timeEst", "time"]
 * @param {any} value
 */
const fdmFormatData = (format, value) => {
  if (value === undefined) {
    return translate("prop.na");
  }

  switch (format) {
    case "number":
      return numberFormat(value);
    case "temp":
      return numberFormat(value) + " °C";
    case "fan":
      return numberFormat(value) + ` ${str_rpm}`;
    case "print":
      return numberFormat(value) + " %";
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
