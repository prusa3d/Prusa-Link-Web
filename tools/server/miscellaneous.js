// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const express = require("express");
const { ApiError } = require("./mock/errors");
const router = new express.Router();

/**
 * version informations
 */
router.get("/version", async (req, res, next) => {
  res.json(req.app.get("printer").version(req.query["system"]));
});

/**
 * Return available logs
 */
router.get("/logs", async (req, res, next) => {
  logs = req.app.get("printer").logs();

  if (logs instanceof ApiError) {
    logs.handleError(res);
    return;
  }

  res.json(logs);
});

/**
 * Return the content of the log file
 */
router.get("/logs/:filename", async (req, res, next) => {
  logs = req.app.get("printer").logs(req.params.filename);

  if (logs instanceof ApiError) {
    logs.handleError(res);
    return;
  }

  res.format({
    "text/plain": () => res.send(logs),
  });
});

// app.get("/api/version", function (req, res) {

/**
 * Retrieve a mock for current connection settings.
 */
router.get("/connection", async (req, res, next) => {
  res.json(req.app.get("printer").connection());
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
  res.json(req.app.get("printer").printerProfiles(req));
});

/**
 * Retrieves all configured system commands.
 */
router.get("/system/commands", async (req, res, next) => {
  const url = req.protocol + "://" + req.get("host") + req.originalUrl;
  res.json(req.app.get("printer").systemCommands(url));
});

/**
 * Execute a configured system commands.
 */
router.get("/system/commands/custom/:command", async (req, res, next) => {
  console.log(`- ${req.method} ${req.originalUrl} - ${req.params} => 501`);
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
        name: "maker", // The user’s name
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
  console.log(`- ${req.method} ${req.originalUrl} - ${req.params} => 501`);
  res.status(501).json({ error: "Not Implemented" });
});

module.exports = router;
