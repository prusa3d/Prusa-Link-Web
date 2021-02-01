// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const express = require("express");
const router = new express.Router();

/**
 * Retrieve information about the current job (if there is
 * one).
 */
router.get("/", async (req, res, next) => {
  const options = {};

  console.log(
    `${req.app.get("printerConf").type} - ${req.method} ${req.originalUrl} - ${
      req.params
    } => 501`
  );
  res.status(501).json({ error: "Not Implemented" });
});

/**
 * Issue a job command.
 */
router.post("/", async (req, res, next) => {
  const options = {
    body: req.body,
  };

  console.log(
    `${req.app.get("printerConf").type} - ${req.method} ${req.originalUrl} - ${
      req.params
    } => 501`
  );
  res.status(501).json({ error: "Not Implemented" });
});

module.exports = router;
