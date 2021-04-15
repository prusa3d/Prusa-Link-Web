// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const basicAuth = require("express-basic-auth");
const bodyParser = require("body-parser");
const { PrinterSL1, PrinterFDM } = require("./mock");
const { Unauthorized, ApiKeyMissing } = require("./mock/errors");

const devServer = (app, conf) => {
  /*
   * api key middleware
   */
  if (conf["http-apikey"]) {
    app.use("/api/", (req, res, next) => {
      if (req.header("X-Api-Key") == "developer") {
        next();
      } else {
        const unauthorizedResponse = new ApiKeyMissing().error;
        res.set("WWW-Authenticate", 'ApiKey realm="401"');
        res.status(401).json(unauthorizedResponse);
      }
    });
  }

  /*
   * http basic middleware
   */
  if (conf["http-basic"]) {
    const unauthorizedResponse = new Unauthorized().error;
    app.use(
      "/api/",
      basicAuth({
        users: { maker: "developer" },
        challenge: true,
        unauthorizedResponse,
      })
    );
  }

  /*
   * Global context
   */
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  if (conf.type == "sl1") {
    app.set("printer", new PrinterSL1());
  } else {
    app.set("printer", new PrinterFDM());
  }

  /*
   * Routes
   */
  app.use("/api/files", require("./files"));
  app.use("/api/printer", require("./printer"));
  app.use("/api/job", require("./job"));
  app.use("/api/thumbnails", require("./thumbnails"));
  app.use("/api/system", require("./system"));
  app.use("/api/", require("./miscellaneous"));
};

module.exports = devServer;
