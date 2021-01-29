// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const telemetry = require("./telemetry");
const basicAuth = require("express-basic-auth");

const devServer = (app, conf) => {
  // api key middleware
  if (conf["http-apikey"]) {
    app.use("/api/", (req, res, next) => {
      if (req.header("X-Api-Key") == "developer") {
        next();
      } else {
        res.set("WWW-Authenticate", 'ApiKey realm="401"');
        res.status(401).send("Authentication required.");
      }
    });
  }

  // http basic middleware
  if (conf["http-basic"]) {
    app.use(
      "/api/",
      basicAuth({
        users: { maker: "developer" },
        challenge: true,
      })
    );
  }

  app.get("/api/version", function (req, res) {
    res.json({
      api: "0.1",
      server: "1.1.0",
      text: "Prusa SLA SL1 1.0.5",
      hostname: `prusa-${conf.type}`,
    });
  });

  telemetry(app, conf.type);
};

module.exports = devServer;
