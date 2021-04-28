// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const express = require("express");
const router = new express.Router();

router.get("/", async (req, res, next) => {
  const printer = req.app.get("printer");
  const last_error = printer.last_error;
  if (last_error) {
    error = last_error["error"];
    res.send(
      `${error["title"]} ${error["code"]} ${error["message"]} ${error["url"]}`
    );
  } else {
    res.send();
  }
});

module.exports = router;
