// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const express = require("express");
const router = new express.Router();

let serial = null;
const settings = {
  "api-key": "cidSLMtQZjIFLg",
  printer: {
    name: "super tiskárna",
    location: "na stole",
  },
  user: {
    username: "heslo_je_pes",
    password: "pes",
  },
};

/**
 * Returns printer settings info.
 */
 router.get("/", async (req, res, next) => {
  const result = JSON.parse(JSON.stringify(settings));
  delete result.user.password;
  res.json(result);
});

/**
 * Sets new printer and/or user settings and writes it to ini file
 */
 router.post("/", async (req, res, next) => {
  const params = req.body;
  const { user, printer } = params;

  if (printer) {
    if (printer.name && printer.location) {
      settings.printer.name = printer.name;
      settings.printer.location = printer.location;
    } else {
      res.status(400).json({ message: "Required printer parameters are missing" });
      return;
    }
  }

  if (user) {
    if (user.password === settings.user.password) {
      if (user.username)
        settings.user.username = user.username;

      if (user.new_password || user.new_repassword) {
        if (user.new_password && (user.new_password === user.new_repassword)) {
          user.password = user.new_password;
        } else {
          res.status(400).json({ message: "New password is missing or does not match repassword" });
          return;
        }
      }
    } else {
      res.status(400).json({ message: "Invalid password" });
      return;
    }
  }

  res.sendStatus(204);
});

/**
 * Returns serial number.
 */
router.get("/sn", async (req, res, next) => {
  res.json({ serial });
});

/**
 * Updates serial number.
 */
router.post("/sn", async (req, res, next) => {
  const params = req.body;
  const sn = params.serial;

  if (sn && typeof sn === "string" && sn.length === "CZPX4242X042XC42042".length) {
    serial = sn;
    res.status(200).json({ serial });
    return;
  }

  res.status(400).json({ message: "Serial number is not corret" });
});

module.exports = router;
