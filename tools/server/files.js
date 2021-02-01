// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const express = require("express");
const router = new express.Router();

/**
 * Retrieve all files’ and folders’ information.
 */
router.get("/", async (req, res, next) => {
  const options = {
    "If-None-Match": req.header["If-None-Match"],
    recursive: req.query["recursive"],
  };
  console.log(
    `${req.app.get("printerConf").type} - ${req.method} ${req.originalUrl} - ${
      req.params
    } => 501`
  );
  res.status(501).json({ error: "Not Implemented" });
});

/**
 * Retrieve all files’ and folders’ information for the target
 * location.
 */
router.get("/:target", async (req, res, next) => {
  const options = {
    "If-None-Match": req.header["If-None-Match"],
    recursive: req.query["recursive"],
  };
  console.log(
    `${req.app.get("printerConf").type} - ${req.method} ${req.originalUrl} - ${
      req.params
    } => 501`
  );
  res.status(501).json({ error: "Not Implemented" });
});

/**
 * Upload file or create folder.
 */
router.post("/:target", async (req, res, next) => {
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

/**
 * Retrieve a specific file’s or folder’s information.
 */
router.get("/:target/:filename(*)", async (req, res, next) => {
  const options = {
    "If-None-Match": req.header["If-None-Match"],
    recursive: req.query["recursive"],
  };
  console.log(
    `${req.app.get("printerConf").type} - ${req.method} ${req.originalUrl} - ${
      req.params
    } => 501`
  );
  res.status(501).json({ error: "Not Implemented" });
});

/**
 * Issue a file command to an existing file.
 */
router.post("/:target/:filename(*)", async (req, res, next) => {
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

/**
 * Delete a file or folder.
 */
router.delete("/:target/:filename(*)", async (req, res, next) => {
  const options = {};
  console.log(
    `${req.app.get("printerConf").type} - ${req.method} ${req.originalUrl} - ${
      req.params
    } => 501`
  );
  res.status(501).json({ error: "Not Implemented" });
});

module.exports = router;
