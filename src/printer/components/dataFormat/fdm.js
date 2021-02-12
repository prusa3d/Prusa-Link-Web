// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { numberFormat } from "./base";

const formatData = (format, value) => {
  if (value === undefined) {
    return "NA";
  }

  switch(format) {
    case "temp": return numberFormat(value) + " °C";
    case "fan": return numberFormat(value) + " RPM";
    case "print": return numberFormat(value) + " mm/s";
    default: return value;
  }
};

export default formatData;
