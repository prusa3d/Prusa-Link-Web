// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const Printer = require("./printer.js");

class PrinterMK3 extends Printer {
  constructor() {
    super(require("./files_gcode"), "Original Prusa MK3", 300);
  }

  job() {
    const jobMK3 = super.job();
    const pos_z = 50;
    const length = 45;
    const volume = 80;

    if (jobMK3.progress) {
      const completion = jobMK3.progress.completion;
      jobMK3.progress = {
        ...jobMK3.progress,
        pos_z_mm: pos_z * completion,
        printSpeed: Math.random() * 10,
        flow_factor: Math.random() * 5,
        filament_status: parseInt(Math.random() * 5),
      };
      jobMK3["filament"] = {
        length: length * completion,
        volume: volume * completion,
      };
    }

    return jobMK3;
  }

  onUpdate() {
    const printerStatus = super.onUpdate();
    const temperatures = printerStatus.temperature;

    printerStatus["telemetry"] = {
      "temp-bed": this.isPrinting ? temperatures.bed.actual : 0,
      "temp-nozzle": this.isPrinting ? temperatures.tool0.actual : 0,
      "print-speed": 100,
      "z-height": 0.5,
      material: "Material",
    };

    return printerStatus;
  }
}

module.exports = PrinterMK3;
