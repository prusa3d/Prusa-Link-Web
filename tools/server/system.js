// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const express = require("express");
const router = new express.Router();
const errors = require("./mock/errors.js");

/**
 * after sending this command, printer should change its state to "busy" (PCL will show "wait until layer finishes").
 * After printer is ready to refill, state should change to "paused"
 * only for sla printers
 */
router.post("/commands/custom/resinrefill", async (req, res, next) => {
  const printer = req.app.get("printer");
  const result = printer.pause();
  if (result instanceof errors.ApiError) {
    result.handleError(res);
  } else {
    res.sendStatus(204);
  }
});

/**
 * after sending this command, printer should update the resin volume in tank.
 * PCL will then send /api/job with command: pause, action: resume
 * only for sla printers
 */
router.post("/commands/custom/resinrefilled", async (req, res, next) => {
  const printer = req.app.get("printer");
  const result = printer.pauseResume();
  if (result instanceof errors.ApiError) {
    result.handleError(res);
  } else {
    res.sendStatus(204);
  }
});

/**
 * Change exposure times
 * only for sla printers
 */
router.post("/commands/custom/changeexposure", async (req, res, next) => {
  const printer = req.app.get("printer");

  const result = printer.changeExposureTimes(req.body);
  if (result instanceof errors.ApiError) {
    result.handleError(res);
  } else {
    res.sendStatus(204);
  }
});

module.exports = router;
