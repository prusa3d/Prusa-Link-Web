// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const Printer = require("./printer.js");
const errors = require("./errors.js");

class PrinterSLA extends Printer {
  constructor(name, code) {
    super(require("./files_sl1"), name, 100, code);
    this.exposureTime = 1500;
    this.exposureTimeFirst = 15000;
    this.exposureTimeCalibration = 3000;
    this.exposureUserProfile = 0;
    this.limits = {
      exposureTime: { min: 1000, max: 60000 },
      exposureTimeFirst: { min: 10000, max: 120000 },
      exposureTimeCalibration: { min: 500, max: 5000 },
      exposureUserProfile: { min: 0, max: 2 },
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
        action: "changeexposure",
        name: "Print Settings",
        source: "custom",
        resource: "http://localhost/api/system/commands/custom/changeexposure",
      },
    ];
    return commands;
  }

  job() {
    const jobSLA = super.job();
    const layers = 200;
    const resin = 100;

    if (this.printingProject) {
      jobSLA.job.file = {
        ...jobSLA.job.file,
        layers: layers,
        layerHeight: 0.05,
        exposureTime: this.exposureTime,
        exposureTimeFirst: this.exposureTimeFirst,
        exposureTimeCalibration: this.exposureTimeCalibration,
        exposureUserProfile: this.exposureUserProfile,
      };
      if (this.isPrinting) {
        const completion = jobSLA.progress.completion;
        jobSLA["resin"] = {
          remaining: (1 - completion) * resin,
          consumed: completion * resin,
        };
        jobSLA.progress["currentLayer"] = parseInt(completion * layers);
      }
    }

    return jobSLA;
  }

  projectExtensions() {
    return [".sl1s"]
  }

  onUpdate() {
    const printerStatus = super.onUpdate();
    const temperatures = printerStatus.temperature;

    printerStatus["telemetry"] = {
      tempCpu: temperatures.bed.actual,
      tempUvLed: this.isPrinting ? temperatures.tool0.actual : 0,
      tempAmbient: temperatures.chamber.actual,
      fanUvLed: this.isPrinting ? Math.random() * 1000 : 0,
      fanBlower: this.isPrinting ? Math.random() * 1000 : 0,
      fanRear: this.isPrinting ? Math.random() * 1000 : 0,
      coverClosed: true,
    };

    return printerStatus;
  }

  changeExposureTimes(exposureTimes) {
    if (!this.printingProject) {
      this.last_error = new errors.NotAvailableInState();
      return this.last_error;
    }

    for (let id in this.limits) {
      const lim = this.limits[id];
      const newValue = exposureTimes[id];
      const hasValue = typeof newValue == "number" && !isNaN(newValue);
      if (hasValue && lim.min <= newValue && newValue <= lim.max) {
        this[id] = newValue;
      } else {
        this.last_error = new errors.RemoteApiError();
        return this.last_error;
      }
    }
    return true;
  }

  getStorage() {
    return {
      local: {
        free_space: 123,
        total_space: 256,
      },
      usb: {
        free_space: 256,
        total_space: 512,
      },
    }
  }
}

module.exports = PrinterSLA;
