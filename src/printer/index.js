// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const printer = (() => {
  if (process.env.TYPE == "mini") return require("./mini");
  if (process.env.TYPE == "sl1") return require("./sl1");
  if (process.env.TYPE == "m1") return require("./m1");
})().default;

export default printer;
