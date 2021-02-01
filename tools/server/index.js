// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const basicAuth = require("express-basic-auth");

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
  const sd = { ready: true }; // Whether the SD card has been initialized (true) or not (false).
  const state = {
    text: "Operational",
    flags: {
      operational: true, // true if the printer is operational, false otherwise
      paused: false, // true if the printer is currently paused, false otherwise
      printing: false, // true if the printer is currently printing, false otherwise
      cancelling: false, // true if the printer is currently printing and in the process of pausing, false otherwise
      pausing: false, // true if the printer is currently printing and in the process of pausing, false otherwise
      sdReady: true, // true if the printer’s SD card is available and initialized, false otherwise. This is redundant information to the SD State.
      error: false, // true if an unrecoverable error occurred, false otherwise
      ready: true, // true if the printer is operational and no data is currently being streamed to SD, so ready to receive instructions
      closedOrError: false, // always false
    },
  };
  const printerProfile = { id: "_default", name: "Original Prusa SL1" };
  app.set("printerConf", { type: conf.type, sd, state, printerProfile });

  /*
   * Routes
   */
  app.use("/api/files", require("./files"));
  app.use("/api/printer", require("./printer"));
  app.use("/api/job", require("./job"));
  app.use("/api/", require("./miscellaneous"));
};

module.exports = devServer;
