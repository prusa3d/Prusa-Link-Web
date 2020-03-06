// This file is part of Prusa-Connect-Web
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

if (process.env.PRINTER == "Original Prusa SL1") {
  printStatus = ["uv_led_fan", "blower_fan", "rear_fan"];
  printTemperatures = ["temp_cpu", "temp_led", "temp_amb"];
  printerState = {
    temp_cpu: 0,
    temp_led: 0,
    temp_amb: 0,
    uv_led_fan: 0,
    blower_fan: 0,
    rear_fan: 0,
    cover_state: false
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
export function update(updateData, clearData) {
  return () => {
    fetch("/api/telemetry", {
      method: "GET",
      headers: {
        "X-Api-Key": process.env.APIKEY,
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    })
      .then(function(response) {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response;
      })
      .then(response => response.json())
      .then(data => {
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

        value = data["cover_closed"];
        if (typeof value == "boolean") {
          printerStatus["cover_state"] = value;
        }
        value = data["material"];
        if (typeof value == "string") {
          printerStatus["material"] = value;
        }

        value = data["state"];
        printer_state = value ? value : { state: STATE_IDLE };

        if (Object.keys(printerStatus).length > 0) {
          updateData({
            printer_status: printerStatus,
            printer_state: printer_state,
            temperatures: [newTemps]
          });
        }
      })
      .catch(e => clearData());
  };
}
