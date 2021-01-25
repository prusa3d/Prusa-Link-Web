// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const telemetry = require("./telemetry");

const devServer = (app, printer) => {
  app.get("/api/version", function (req, res) {
    res.json({
      api: "0.1",
      server: "1.1.0",
      text: "Prusa SLA SL1 1.0.5",
      hostname: `prusa-${printer}`,
    });
  });

  telemetry(app, printer);

};

module.exports = devServer;
