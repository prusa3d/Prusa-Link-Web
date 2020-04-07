// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later
import { STATE_IDLE } from "../utils/states";

export interface PrinterStatus {
  temp_cpu?: number;
  temp_led?: number;
  temp_amb?: number;
  uv_led_fan?: number;
  blower_fan?: number;
  rear_fan?: number;
  cover_state?: boolean;
  temp_bed?: number;
  temp_nozzle?: number;
  material?: string;
}

export interface PrinterState {
  state: number;
  substate?: number;
}

let printStatus: string[];
let printTemperatures: string[];
let printerState: PrinterStatus;

if (process.env.IS_SL1) {
  printStatus = ["uv_led_fan", "blower_fan", "rear_fan"];
  printTemperatures = ["temp_cpu", "temp_led", "temp_amb"];
  printerState = {
    temp_cpu: 0,
    temp_led: 0,
    temp_amb: 0,
    uv_led_fan: 0,
    blower_fan: 0,
    rear_fan: 0,
    cover_state: true
  };
} else {
  printStatus = ["material"];
  printTemperatures = ["temp_bed", "temp_nozzle"];
  printerState = {
    temp_bed: 0,
    temp_nozzle: 0,
    material: ""
  };
}

export const initPrinterState = printerState;
export function update(updateData: (data) => void) {
  return (response: Response) =>
    response.json().then(data => {
      let printerStatus = {};
      let printer_state;
      let newTemps = [];
      let value = null;

      // printer status
      for (let item of printStatus) {
        value = data[item];
        if (value) {
          printerStatus[item] = value;
        } else {
          printerStatus[item] = 0;
        }
      }

      // printer temperatures
      newTemps.push(new Date().getTime());
      for (let item of printTemperatures) {
        value = data[item];
        if (value) {
          printerStatus[item] = value;
          newTemps.push(value);
        } else {
          printerStatus[item] = 0;
          newTemps.push(value);
        }
      }
      if (process.env.IS_SL1) {
        printerStatus["cover_state"] = data["cover_closed"] ? true : false;
      } else {
        printerStatus["material"] = data["material"];
      }

      value = data["state"];
      printer_state = value ? value : { state: STATE_IDLE };

      if (newTemps[1]) {
        updateData({
          printer_status: printerStatus,
          printer_state: printer_state,
          temperatures: [newTemps]
        });
      }
    });
}
