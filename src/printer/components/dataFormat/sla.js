// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { numberFormat } from "./base";

const formatData = (format, value) => {
  if (value === undefined) {
    return "NA";
  }
  if (format === "temp") {
    return numberFormat(value) + " °C";
  } else if (format === "fan") {
    return numberFormat(value) + " RPM";
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

export default formatData;
