// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const Printer = require("./printer.js");

class PrinterMK3 extends Printer {
  constructor() {
    super(require("./files_sl1"), "Original Prusa Mini", 300);
  }

  job() {
    const jobMK3 = super.job();

    if (jobMK3.progress) {
      jobMK3.progress = {
        ...jobMK3.progress,
        pos_z_mm: 1,
        printSpeed: 1,
        flow_factor: 3,
        filament_status: 4,
      };
      jobMK3["filament"] = {
        length: 1,
        volume: 2,
      };
    }

    return jobMK3;
  }

  onUpdate() {
    const printerStatus = super.onUpdate();
    const temperatures = printerStatus.temperature;

    printerStatus["telemetry"] = {
      "temp-bed": this.isPrinting ? temperatures.bed.actual : 0,
      "temp-nozzle": this.isPrinting ? temperatures.chamber.actual : 0,
      "print-speed": 100,
      "z-height": 0.5,
      material: "Material",
    };

    return printerStatus;
  }
}

module.exports = PrinterMK3;
