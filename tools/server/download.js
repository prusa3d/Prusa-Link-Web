// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const express = require("express");
const router = new express.Router();
const errors = require("./mock/errors.js");

/**
 * Download file from url to intended location..
 */
router.post("/:target", async (req, res, next) => {
  const target = req.params.target;

  const options = {
    url: req.body.url,
    target,
    destination: req.body.destination || "",
    size: 3705000,
    to_select: req.body.to_select || false,
    to_print: req.body.to_print || false,
    rename: req.body.rename || "",
  };

  const printer = req.app.get("printer");
  const result = printer.startDownload(options);

  if (result instanceof errors.ApiError) {
    result.handleError(res);
  } else {
    res.status(201).send();
  }
});

/**
 * Get information about the file currently being downloaded.
 */
router.get("/", async (req, res, next) => {
  const printer = req.app.get("printer");
  const result = printer.download();

  if (result instanceof errors.ApiError) {
    result.handleError(res);
  } else if (!result) {
    res.status(204).send();
  } else {
    res.status(200).send(result);
  }
});

module.exports = router;
