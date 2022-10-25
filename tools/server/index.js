// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const basicAuth = require("express-basic-auth");
const bodyParser = require("body-parser");
const { PrinterSLA, PrinterFDM } = require("./mock");
const { Unauthorized, ApiKeyMissing } = require("./mock/errors");

const devServer = (app, conf) => {
  /*
   * api key middleware
   */
  if (conf["HTTP_APIKEY"]) {
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
  if (conf["HTTP_BASIC"]) {
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
  if (conf.PRINTER_TYPE == "sla") {
    app.set("printer", new PrinterSLA(conf.PRINTER_NAME, conf.PRINTER_CODE));
  } else {
    app.set("printer", new PrinterFDM(conf.PRINTER_NAME, conf.PRINTER_CODE));
  }

  /*
   * Routes
   */
  app.use("/api/", require("./miscellaneous"));
  app.use("/api/download", require("./download"));
  app.use("/api/files", require("./files"));
  app.use("/api/job", require("./job"));
  app.use("/api/printer", require("./printer"));
  app.use("/api/settings", require("./settings"));
  app.use("/api/system", require("./system"));
  app.use("/api/thumbnails", require("./thumbnails"));
  app.use("/api/v1/cameras", require("./cameras"));
  app.use("/error", require("./error"));
};

module.exports = devServer;
