// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const basicAuth = require("express-basic-auth");
const bodyParser = require("body-parser");

const devServer = (app, conf) => {
  /*
   * api key middleware
   */
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

  /*
   * http basic middleware
   */
  if (conf["http-basic"]) {
    app.use(
      "/api/",
      basicAuth({
        users: { maker: "developer" },
        challenge: true,
      })
    );
  }

  /*
   * Global context
   */
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.set("printerConf", require("./config")(conf));

  /*
   * Routes
   */
  app.use("/api/files", require("./files"));
  app.use("/api/printer", require("./printer"));
  app.use("/api/job", require("./job"));
  app.use("/api/", require("./miscellaneous"));
};

module.exports = devServer;
