// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const express = require("express");
const router = new express.Router();

const _job = (printerConf) => {
  const printing = printerConf.printing;
  const printingFile = printing.file;

  const result = {};
  result["file"] = {
    name: printingFile.name,
    origin: printingFile.origin,
    size: printingFile.size,
    date: printingFile.date,
  };

  result["estimatedPrintTime"] = printing.estimatedPrintTime;

  const aux = 2 * 6000;
  printing.completion = printing.completion + 0.1;
  printing.printTime = printing.printTime + aux;
  printing.printTimeLeft = printing.printTimeLeft - aux;
  result["progress"] = {
    completion: printing.completion,
    filepos: printingFile.size * printing.completion,
    printTime: printing.printTime,
    printTimeLeft: printing.printTimeLeft,
  };

  if (printing.completion >= 0.9) {
    printerConf.state.text = "Operational";
    printerConf.state.flags.printing = false;
    printerConf.state.flags.ready = true;
    printing.file = null;
    printing.selected = false;
    printing.printing = false;
    printing.estimatedPrintTime = 0;
    printing.completion = 0;
    printing.printTime = 0;
    printing.printTimeLeft = 0;
  }

  return result;
};

const _jobSLA = (printerConf) => {
  let job = {};
  if (printerConf.printing.printing) {
    job = _job(printerConf);
    job["file"]["layers"] = 101;
    job["file"]["exposureTime"] = 1;
    job["file"]["exposureTimeFirst"] = 2;

    job["resin"] = {
      remaining: 134.5,
      consumed: 22.4,
    };

    job["progress"]["currentLayer"] = 2;
  }

  job["state"] = printerConf.state.text;

  return job;
};

const _jobFDM = (printerConf) => {
  let job = {};
  if (printerConf.printing.printing) {
    job = _job(printerConf);

    job["filament"] = {
      tool0: {
        length: 810,
        volume: 5.36,
      },
    };

    job["progress"] = Object.assign(job["progress"], {
      pos_z_mm: 1,
      printSpeed: 1,
      flow_factor: 1,
      filament_status: 1,
    });
  }

  job["state"] = printerConf.state.text;

  return job;
};

/**
 * Retrieve information about the current job (if there is
 * one).
 */
router.get("/", async (req, res, next) => {
  const printerConf = req.app.get("printerConf");
  let job = null;

  if (printerConf.type == "sl1") {
    job = _jobSLA(printerConf);
  } else {
    job = _jobFDM(printerConf);
  }

  res.json(job);
});

/**
 * Issue a job command.
 */
router.post("/", async (req, res, next) => {
  const printerConf = req.app.get("printerConf");
  const command = req.body.command; // start, cancel, restart, pause
  const action = req.body.action; // pause, resume, toggle

  if (command == undefined) {
    res.status(400).json({ error: "Bad Request" });
    return;
  }

  const printing = printerConf.printing;
  if (command == "start") {
    if (printing.printing) {
      res.status(409).json({ error: "Conflict" });
      return;
    }

    if (!printing.selected) {
      res.status(409).json({ error: "Conflict" });
      return;
    }

    printing.printing = true;
  }

  res.status(204).send();
});

module.exports = router;
