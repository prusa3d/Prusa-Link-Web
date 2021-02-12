// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import formatData from "./dataFormat";

const telemetry = (data) => {
  if (process.env.TYPE == "sl1") {
    return slaTelemetry(data);
  } else {
    return fdmTelemetry(data);
  }
};

const slaTelemetry = (data) => {
  const rawData = data.telemetry;
  document.querySelectorAll(".tel-prop .value p[id]").forEach((elm) => {
    elm.innerHTML = formatData(elm.dataset.format, rawData[elm.id]);
  });
};

const fdmTelemetry = (data) => {
  function getValue(id, data) {
    switch (id) {
      case "temp-nozzle":
        return data.temperature.chamber.actual;
      case "temp-bed":
        return data.temperature.bed.actual;
      case "print-speed":
        return undefined;
      case "z-height":
        return undefined;
      case "material":
        return data.telemetry.material;
      default:
        return undefined;
    }
  }

  document.querySelectorAll(".tel-prop .value p[id]").forEach((elm) => {
    elm.innerHTML = formatData(elm.dataset.format, getValue(elm.id, data));
  });
};

export default telemetry;
