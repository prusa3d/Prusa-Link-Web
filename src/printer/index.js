// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const printer = (() => {
  if (process.env.PRINTER_TYPE === "sla") return require("./sla");
  if (process.env.PRINTER_TYPE === "fdm") return require("./fdm");
  if (process.env.PRINTER_TYPE === "virtual") return require("./virtual");
})().default;

export default printer;
