// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { translate } from "../../locale_provider";

// TODO: translate more units - mm, s, ...
const str_at = translate("prop.at");
const str_h = translate("unit.h");
const str_less_than_a_minute = translate("prop.less-than");
const str_min = translate("unit.min");
const str_ml = translate("unit.ml");
const str_rpm = translate("unit.rpm");
const str_today_at = translate("prop.today-at");
const str_tomorow_at = translate("prop.tmw-at");
const str_B = translate("unit.b");
const str_KB = translate("unit.kb");
const str_MB = translate("unit.mb");
const str_GB = translate("unit.gb");
const str_true = translate("prop.true");
const str_false = translate("prop.false");

/**
 * It formats a number using fixed-point notation with one digit after the decimal point.
 * ex: 123.456 => 123.4
 * @param {number} value
 */
function numberFormat(value, toFixed = true, decimal = 1) {
  if (value > 0) {
    if (toFixed) {
      return value.toFixed(decimal);
    } else {
      return value;
    }
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
  var lang = localStorage.getItem("lang");
  const dateFormatted =
    date.toLocaleDateString(lang, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }) +
    " " +
    date.toLocaleTimeString(lang, { hour: "numeric", minute: "numeric" });
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
    let end = new Date(now.getTime() + time * 1000);
    let tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let plus_days = "";
    if (end.getDate() == now.getDate() && end.getMonth() == now.getMonth()) {
      plus_days = `${str_today_at} `;
    } else if (
      end.getDate() == tomorrow.getDate() &&
      end.getMonth() == tomorrow.getMonth()
    ) {
      plus_days = `${str_tomorow_at} `;
    } else {
      let options = { month: "numeric", day: "numeric" };
      const final_date = end.toLocaleString(window.navigator.language, options);
      plus_days = `${final_date} ${str_at} `;
    }

    estimated_end =
      plus_days +
      ("0" + end.getHours()).substr(-2) +
      ":" +
      ("0" + end.getMinutes()).substr(-2);
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
  return (
    (hours > 0 ? `${hours} ${str_h}` : "") +
    (minutes > 0 ? ` ${minutes} ${str_min}` : "")
  );
  // return short format X h Y min
  // TODO: lack of proper pluralization (czech - 1 minuta, 2 minuty, 5 minut)
}

/**
 * Return exposureTimeFirst/exposureTime/exposureTimeCalibration in milliseconds
 * @param {object} expo
 */
function formatExposure(expo) {
  if (
    expo.exposureTimeFirst == undefined ||
    expo.exposureTime == undefined ||
    expo.exposureTimeCalibration == undefined
  ) {
    return translate("prop.na");
  }

  let expo_times = `${numberFormat(
    expo.exposureTimeFirst / 1000,
    true,
    0
  )} / ${numberFormat(expo.exposureTime / 1000)}`;
  if (expo.exposureTimeCalibration !== undefined) {
    expo_times = `${expo_times} / ${numberFormat(
      expo.exposureTimeCalibration / 1000
    )}`;
  }
  return expo_times + " s";
}

function totalLayers(data) {
  const currentLayer = data?.progress?.currentLayer;
  const layers = data?.job?.file?.layers;
  if (currentLayer == undefined || layers == undefined) {
    return translate("prop.na");
  }
  return `${currentLayer}/${layers}`;
}

/**
 * Formats the size in bytes to the most suitable unit - B, KB, MB or GB
 * @param {number} size Size in bytes
 */
function formatSize(size) {
  let value = size;
  const units = [str_B, str_KB, str_MB, str_GB];

  for (let i = 0; i < units.length; i++) {
    if (value < 1000 || i == units.length - 1)
      return value.toLocaleString(localStorage.getItem("lang"), { maximumFractionDigits: 2 }) + " " + units[i];
    value /= 1024;
  }
}

/**
 * Formats the boolean value into locale string
 * @param {boolean | "true" | "false" | 0 | 1} value
 */
function formatBoolean(value) {
  switch (value) {
    case true:
    case "true":
    case 1:
      return str_true;

    case false:
    case "false":
    case 0:
      return str_false;

    default:
      return value;
  }
}

/**
 * Format the value data with format specificated.
 * @param {string} format - one of ["number", "temp", "fan", "pos", "date", "progress", "timeEst", "time"]
 * @param {any} value
 */
const formatData = (format, value) => {
  if (value === undefined || (value === null && format !== "progress")) {
    return translate("prop.na");
  }

  switch (format) {
    case "int":
      return parseInt(value);
    case "number":
      return numberFormat(value);
    case "layer":
      return numberFormat(value, false) + " mm";
    case "totalLayer":
      return totalLayers(value);
    case "material":
      return value || translate("prop.na");
    case "temp":
      return numberFormat(value) + " °C";
    case "temp_int":
        return numberFormat(value, 0) + "°C";
    case "fan":
      return numberFormat(value) + ` ${str_rpm}`;
    case "resin":
      return numberFormat(value) + ` ${str_ml}`;
    case "cover":
      return value
        ? translate("prop.cover-closed")
        : translate("prop.cover-opened");
    case "print":
      return numberFormat(value || 0, true, 0) + "%";
    case "pos":
      return numberFormat(value) + " mm";
    case "date":
      return dateFormat(value);
    case "time":
      return formatTime(value);
    case "timeEst":
      return formatEstimatedTime(value);
    case "progressPct":
      return numberFormat((value || 0), true, 0) + "%";
    // NOTE: keep for compatibility, until complete migration to v1
    case "progress":
      return numberFormat((value || 0) * 100, true, 0) + "%";
    case "percent":
      return `${numberFormat((value || 0), true, 0)}%`;
    case "material":
      return value || translate("prop.na");
    case "size":
      return formatSize(value);
    case "boolean":
      return formatBoolean(value);
    case "diameter":
      return numberFormat(value, true, 2) + " mm";
    default:
      return value;
  }
};

export default formatData;
