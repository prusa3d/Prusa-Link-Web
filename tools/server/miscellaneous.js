// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const express = require("express");
const router = new express.Router();

/**
 * version informations
 */
router.get("/version", async (req, res, next) => {
  res.json({
    api: "0.1",
    server: "1.1.0",
    text: "Prusa SLA SL1 1.0.5",
    hostname: `prusa-${req.app.get("printerConf").type}`,
  });
});

// app.get("/api/version", function (req, res) {

/**
 * Retrieve a mock for current connection settings.
 */
router.get("/connection", async (req, res, next) => {
  const printerProfile = req.app.get("printerConf").printerProfile;
  res.json({
    current: {
      baudrate: null,
      port: null,
      printerProfile: "_default",
      state: "Operational",
    },
    options: {
      baudratePreference: null,
      baudrates: [],
      portPreference: null,
      ports: [],
      printerProfilePreference: "_default",
      printerProfiles: [printerProfile],
    },
  });
});

/**
 * Issue a connection command
 */
router.post("/connection", async (req, res, next) => {
  res.status(204).send();
});

/**
 * Retrive a mock of octoprinter printer profile
 */
router.get("/printerprofiles", async (req, res, next) => {
  const printerProfile = req.app.get("printerConf").printerProfile;
  res.json({
    profiles: [
      {
        id: printerProfile.id,
        name: printerProfile.name,
        model: printerProfile.name,
        color: "default",
        current: true,
        default: true,
        resource:
          req.protocol +
          "://" +
          req.get("host") +
          req.originalUrl +
          "/_default",
        heatedBed: true, // Original Prusa SL1 uses for CPU temperature
        heatedChamber: true, // Original Prusa SL1 uses for ambient temp
        extruder: {
          // Original Prusa SL1 uses for UV LED temp
          count: 1, // Number of print heads
          offsets: [0.0, 0.0],
        },
      },
    ],
  });
});

/**
 * Retrieves all configured system commands.
 */
router.get("/system/commands", async (req, res, next) => {
  const commands = { core: [], custom: [] };
  const url = req.protocol + "://" + req.get("host") + req.originalUrl;

  if (req.app.get("printerConf").type == "sl1") {
    commands["custom"] = [
      {
        action: "resinrefill", // after sending this command, printer should change its state to "busy" (PCL will show "wait until layer finishes"). After printer is ready to refill, state should change to "paused"
        name: "ResinRefill",
        source: "custom",
        resource: url + "/custom/resinrefill",
      },
      {
        action: "resinrefilled", // after sending this command, printer should update the resin volume in tank. PCL will then send /api/job with command: pause, action: resume
        name: "ResinRefilled",
        source: "custom",
        resource: url + "/custom/resinrefilled",
      },
    ];
  }

  res.json(commands);
});

/**
 * Execute a configured system commands.
 */
router.get("/system/commands/custom/:command", async (req, res, next) => {
  console.log(
    `${req.app.get("printerConf").type} - ${req.method} ${req.originalUrl} - ${
      req.params
    } => 501`
  );
  res.status(501).json({ error: "Not Implemented" });
});

/**
 * Retrieves a list of all registered users in OctoPrint.
 * Currently just a mock.
 */
router.get("/access/users", async (req, res, next) => {
  res.json({
    users: [
      {
        active: true, // Whether the user’s account is active (true) or not (false)
        apikey: null, // The user’s personal API key
        name: "prusa", // The user’s name
        settings: {}, // The user’s personal settings, might be an empty object.
        user: true, // Whether the user has user rights. Should always be true. Deprecated as of 1.4.0, use the users group instead.
        admin: true, // Whether the user has admin rights (true) or not (false). Deprecated as of 1.4.0, use the admins group instead.
      },
    ],
  });
});

/**
 * Download a file.
 */
router.get("/downloads/:target/:filename(*)", async (req, res, next) => {
  const options = {};

  console.log(
    `${req.app.get("printerConf").type} - ${req.method} ${req.originalUrl} - ${
      req.params
    } => 501`
  );
  res.status(501).json({ error: "Not Implemented" });
});

module.exports = router;
