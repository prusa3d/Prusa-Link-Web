// This file is part of the Prusa Link Web
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
    storage: true,
  };
  if (req.query["exclude"]) {
    let listExclude = req.query["exclude"].split(",");
    for (var key of listExclude) {
      include[key] = false;
    }
  }

  if (!(include.temperature || include.state || include.sd || include.storage)) {
    res.status(400).json({ message: "Bad request" });
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

  if (include.storage) {
    result["storage"] = data.storage;
  }

  res.json(result);
});

/**
 * Retrieves the current state of the printer’s SD card.
 */
router.get("/sd", async (req, res, next) => {
  res.json(req.app.get("printer").getSD());
});

router.get("/error", async (req, res, next) => {
  const printer = req.app.get("printer");
  const last_error = printer.last_error;
  if (last_error) {
    res.json(last_error["error"]);
  } else {
    res.json({});
  }
});

router.post("/printhead", async (req, res, next) => {
  res.status(204).send();
});

router.post("/tool", async (req, res, next) => {
  res.status(204).send();
});

router.post("/bed", async (req, res, next) => {
  res.status(204).send();
});

module.exports = router;
