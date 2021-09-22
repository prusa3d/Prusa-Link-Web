// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const Printer = require("./printer.js");
const errors = require("./errors.js");

class PrinterSL1 extends Printer {
  constructor() {
    super(require("./files_sl1"), "Original Prusa SL1", 100);
    this.exposureTime = 1500;
    this.exposureTimeFirst = 15000;
    this.exposureTimeCalibration = 3000;
    this.exposureUserProfile = 0;
    this.limits = {
      exposureTime: { min: 1000, max: 60000 },
      exposureTimeFirst: { min: 10000, max: 120000 },
      exposureTimeCalibration: { min: 500, max: 5000 },
      exposureUserProfile: { min: 0, max: 1 },
    };
  }

  systemCommands(url) {
    const commands = super.systemCommands(url);
    commands["custom"] = [
      {
        action: "resinrefill", // after sending this command, printer should change its state to "busy" (PCL will show "wait until layer finishes"). After printer is ready to refill, state should change to "paused"
        name: "Resin Refill",
        confirm: "Are you sure?",
        source: "custom",
        resource: url + "/custom/resinrefill",
      },
      {
        action: "resinrefilled", // after sending this command, printer should update the resin volume in tank. PCL will then send /api/job with command: pause, action: resume
        name: "Resin Refilled",
        source: "custom",
        resource: url + "/custom/resinrefilled",
      },
      {
        action: "changeexposure",
        name: "Print Settings",
        source: "custom",
        resource: "http://localhost/api/system/commands/custom/changeexposure",
      },
    ];
    return commands;
  }

  job() {
    const jobSL1 = super.job();
    const layers = 200;
    const resin = 100;

    if (this.status.printing) {
      jobSL1.job.file = {
        ...jobSL1.job.file,
        layers: layers,
        layerHeight: 0.05,
        exposureTime: this.exposureTime,
        exposureTimeFirst: this.exposureTimeFirst,
        exposureTimeCalibration: this.exposureTimeCalibration,
        exposureUserProfile: this.exposureUserProfile,
      };
      if (this.isPrinting) {
        const completion = jobSL1.progress.completion;
        jobSL1["resin"] = {
          remaining: (1 - completion) * resin,
          consumed: completion * resin,
        };
        jobSL1.progress["currentLayer"] = parseInt(completion * layers);
      }
    }

    return jobSL1;
  }

  onUpdate() {
    const printerStatus = super.onUpdate();
    printerStatus["telemetry"] = {
      fanUvLed: this.isPrinting ? Math.random() * 1000 : 0,
      fanBlower: this.isPrinting ? Math.random() * 1000 : 0,
      fanRear: this.isPrinting ? Math.random() * 1000 : 0,
      coverClosed: false,
    };

    return printerStatus;
  }

  changeExposureTimes(exposureTimes) {
    if (!this.status.printing) {
      this.last_error = new errors.NotAvailableInState();
      return this.last_error;
    }

    for (let id in this.limits) {
      const lim = this.limits[id];
      const newValue = exposureTimes[id];
      if (newValue && lim.min <= newValue && newValue <= lim.max) {
        this[id] = newValue;
      } else {
        this.last_error = new errors.RemoteApiError();
        return this.last_error;
      }
    }
    return true;
  }
}

module.exports = PrinterSL1;
