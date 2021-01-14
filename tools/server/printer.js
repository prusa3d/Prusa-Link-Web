// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const express = require("express");
const router = new express.Router();

/**
 * Retrive the current printer state
 */
router.get("/", async (req, res, next) => {
  let include = {
    temperature: true,
    sd: true,
    state: true,
  };
  if (req.query["exclude"]) {
    let listExclude = req.query["exclude"].split(",");
    for (var key of listExclude) {
      include[key] = false;
    }
  }

  if (!(include.temperature || include.state || include.sd)) {
    res.status(400).json({ error: "Bad request" });
    return;
  }

  const data = req.app.get("printer").onUpdate();
  const result = {};
  if (data.telemetry) {
    result["telemetry"] = data.telemetry;
  }

  if (include.temperature) {
    result["temperature"] = data.temperature;
  }

  if (include.sd) {
    result["sd"] = data.sd;
  }

  if (include.state) {
    result["state"] = data.state;
  }

  res.json(result);
});

/**
 * Retrieves the current state of the printer’s SD card.
 */
router.get("/sd", async (req, res, next) => {
  res.json(req.app.get("printer").getSD());
});

/**
 * Retrive the error number and text. Not compatible with
 * OctoPrint.
 *
 * MINI
 * - will probably not support this endpoint.
 * - On error sends plaintext error description in response body
 * - On error possibly sends Content-Location header with URL to help.prusa3d.com.
 * - PCL page /error will be ommited
 *
 * SL1
 * - supports this endpoint
 * - Response is dependent on Accept header in request
 * - If no Accept header is present:
 *   - sends plaintext error description in response body (compatibility with older slicer)
 *   - sends Content-Location header with URL to <PCL IP>/error (in the future it may send URL to hlep.prusa3d.com)
 * - if Accept header is present (currently supports only Accept: application/json):
 *   - sends JSON with same content as this /api/printer/error endpoint (code, title, text, url)
 *    sends Content-Location header with URL to <PCL IP>/error (in the future it may send URL to hlep.prusa3d.com)
 */
router.get("/error", async (req, res, next) => {
  console.log(`- ${req.method} ${req.originalUrl} - ${req.params} => 501`);
  res.status(501).json({ error: "Not Implemented" });
});

module.exports = router;
