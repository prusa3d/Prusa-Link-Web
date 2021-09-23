// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const path = require("path");
const fs = require("fs");
const express = require("express");
const router = new express.Router();

/**
 * Retrieve a specific file’s thumbnails.
 */
router.get("/:filename(*)", async (req, res, next) => {
  const pathname = path.join(
    path.resolve(__dirname, "static"),
    req.params.filename
  );

  fs.stat(pathname, (err, stats) => {
    if (err || !stats.isFile()) {
      res.sendStatus(404);
    } else {
      res.sendFile(pathname);
    }
  });
});

module.exports = router;
