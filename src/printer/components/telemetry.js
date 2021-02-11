// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import formatData from "./dataFormat";

const telemetry = (data) => {
  const rawData = data.telemetry;
  document.querySelectorAll(".tel-prop .value p[id]").forEach((elm) => {
    elm.innerHTML = formatData(elm.dataset.format, rawData[elm.id]);
  });
};

export default telemetry;
