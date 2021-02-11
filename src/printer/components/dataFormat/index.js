// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const formatData = (() => {
  if (process.env.TYPE == "mini") return require("./fdm");
  if (process.env.TYPE == "sl1") return require("./sla");
  if (process.env.TYPE == "mk3") return require("./fdm");
})().default;

export default formatData;
