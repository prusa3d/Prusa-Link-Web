// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const express = require("express");
const router = new express.Router();

/**
 * after sending this command, printer should change its state to "busy" (PCL will show "wait until layer finishes").
 * After printer is ready to refill, state should change to "paused"
 */
router.get("/commands/core/resinrefill", async (req, res, next) => {
  res.sendStatus(201);
});

/**
 * after sending this command, printer should update the resin volume in tank.
 * PCL will then send /api/job with command: pause, action: resume
 */
router.get("/commands/core/resinrefilled", async (req, res, next) => {
  res.sendStatus(201);
});

module.exports = router;
