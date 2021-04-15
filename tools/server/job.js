// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const express = require("express");
const router = new express.Router();
const errors = require("./mock/errors.js");

/**
 * Retrieve information about the current job (if there is
 * one).
 */
router.get("/", async (req, res, next) => {
  res.json(req.app.get("printer").job());
});

/**
 * Issue a job command.
 */
router.post("/", async (req, res, next) => {
  const printer = req.app.get("printer");
  const command = req.body.command; // start, cancel, restart, pause
  const action = req.body.action; // pause, resume, toggle

  let result = null;
  if (command == "start") {
    result = printer.print();
  } else if (command == "cancel") {
    result = printer.stop();
  } else if (command == "pause" && action == "resume") {
    result = printer.pauseResume();
  }

  if (result) {
    if (result instanceof errors.ApiError) {
      result.handleError(res);
      return;
    } else {
      res.status(204).send();
      return;
    }
  }

  new errors.RemoteApiError().handleError(res);
});

module.exports = router;
