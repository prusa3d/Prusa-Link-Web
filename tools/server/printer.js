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

  printerConf = req.app.get("printerConf");

  const result = {};
  if (include.temperature) {
    if (printerConf.type == "sl1") {
      result["temperature"] = {
        tool0: {
          // Original Prusa SL1 uses for UV LED temp
          actual: Math.random() * 100,
        },
        bed: {
          // Original Prusa SL1 uses for CPU temperature
          actual: Math.random() * 50,
        },
        chamber: {
          // Original Prusa SL1 uses for ambient temp
          actual: Math.random() * 45,
        },
      };

      result["telemetry"] = {
        fanUvLed: Math.random() * 1000,
        fanBlower: Math.random() * 1000,
        fanRear: Math.random() * 1000,
        coverClosed: true,
      };
    } else {
      result["temperature"] = {
        tool0: {
          actual: Math.random() * 300, // Current temperature
          target: 220.0, // Target temperature, may be null if no target temperature is set.
          offset: 0, // Currently configured temperature offset to apply, will be left out for historic temperature information.
        },
        bed: {
          actual: Math.random() * 200,
          target: 70.0,
          offset: 5,
        },
        chamber: {
          actual: Math.random() * 150,
          target: null,
          offset: 0,
        },
      };

      result["telemetry"] = {
        material: "PETG Black",
      };
    }
  }

  if (include.sd) {
    result["sd"] = printerConf.sd;
  }

  if (include.state) {
    result["state"] = printerConf.state;
  }

  res.json(result);
});

/**
 * Retrieves the current state of the printer’s SD card.
 */
router.get("/sd", async (req, res, next) => {
  res.json(req.app.get("printerConf").sd);
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
  const options = {};

  console.log(
    `${req.app.get("printerConf").type} - ${req.method} ${req.originalUrl} - ${
      req.params
    } => 501`
  );
  res.status(501).json({ error: "Not Implemented" });
});

module.exports = router;
