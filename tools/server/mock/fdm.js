// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const Printer = require("./printer.js");

class PrinterFDM extends Printer {
  constructor() {
    super(require("./files_gcode"), "FDM Mock Printer", 300);
  }

  job() {
    const job = super.job();
    const pos_z = 50;
    const length = 45;
    const volume = 80;

    if (job.progress) {
      const completion = job.progress.completion;
      job.progress = {
        ...job.progress,
        pos_z_mm: pos_z * completion,
        printSpeed: Math.random() * 10,
        flow_factor: Math.random() * 5,
        filament_status: parseInt(Math.random() * 5),
      };
      job["filament"] = {
        length: length * completion,
        volume: volume * completion,
      };
    }

    return job;
  }

  onUpdate() {
    const printerStatus = super.onUpdate();
    const temperatures = printerStatus.temperature;

    printerStatus["telemetry"] = {
      material: "Material",
    };

    return printerStatus;
  }
}

module.exports = PrinterFDM;
