// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

export interface printerState {
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

let printStatus: string[];
let printTemperatures: string[];
let printerState: printerState;

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
        let printerState = {};
        let state: string;
        let newTemps = [];
        let value = null;

        // printer status
        for (let item of printStatus) {
          value = data[item];
          if (value) {
            printerState[item] = value;
          } else {
            printerState[item] = 0;
          }
        }

        // printer temperatures
        newTemps.push(new Date().getTime());
        for (let item of printTemperatures) {
          value = data[item];
          if (value) {
            printerState[item] = value;
            newTemps.push(value);
          } else {
            printerState[item] = 0;
            newTemps.push(value);
          }
        }

        value = data["cover_closed"];
        if (typeof value == "boolean") {
          printerState["cover_state"] = value;
        }
        value = data["material"];
        if (typeof value == "string") {
          printerState["material"] = value;
        }

        value = data["state"];
        state = value ? value : "IDLE";

        if (Object.keys(printerState).length > 0) {
          updateData({
            printer_state: printerState,
            state: state,
            temperatures: [newTemps]
          });
        }
      })
      .catch(e => clearData());
  };
}
