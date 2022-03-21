// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

// NOTE: globally disable custom font for now
// if (process.env.WITH_FONT) {
//   require("../atlas-grotesk-web.css");
//}

import "../fonts.css";

const printer = (() => {
  if (process.env.PRINTER_TYPE === "sla") return require("./sla");
  if (process.env.PRINTER_TYPE === "fdm") return require("./fdm");
})().default;

export default printer;
