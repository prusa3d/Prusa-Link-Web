// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const numberFormat = (value) => {
  if (value > 0) {
    return value.toFixed(1);
  } else {
    return 0;
  }
};

const formatData = (format, value) => {
  if (value === undefined) {
    return "NA";
  }
  if (format === "temp") {
    return numberFormat(value) + " °C";
  } else if (format === "fan") {
    return numberFormat(value) + " RPM";
  } else if (format == "mat") {
    return value;
  } else if (format == "cover") {
    if (value) {
      return "Opened";
    } else {
      return "Closed";
    }
  } else {
    return value;
  }
};

const telemetry = (data) => {
  const rawData = data.telemetry;
  document.querySelectorAll(".tel-prop .value p[id]").forEach((elm) => {
    elm.innerHTML = formatData(elm.dataset.format, rawData[elm.id]);
  });
};

export default telemetry;
