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
    pos_z_mm?: number;
    printing_speed?: number;
    flow_factor?: number;
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
        cover_state: false,
    };
} else {
    printStatus = ["pos_z_mm", "printing_speed", "flow_factor"];
    printTemperatures = ["temp_bed", "temp_nozzle"];
    printerState = {
        temp_bed: 0,
        temp_nozzle: 0,
        material: "",
        pos_z_mm: 0,
        printing_speed: 0,
        flow_factor: 0
    };

}

export const initPrinterState = printerState;
export function update(updateData, clearData) {
    return () => {

        fetch('/api/telemetry', {
            method: 'GET',
            headers: {
                "X-Api-Key": process.env.APIKEY,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        })
            .then(function (response) {
                if (!response.ok) {
                    throw Error(response.statusText);
                }
                return response;
            })
            .then(response => response.json())
            .then(data => {

                let printerState = {};
                let newTemps = [];
                let newProgress_status = {};
                let newProgress_bar = {};
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
                        newTemps.push(value)
                    } else {
                        printerState[item] = 0;
                        newTemps.push(value)
                    }
                }

                value = data["cover_closed"];
                if (typeof (value) == "boolean") {
                    printerState["cover_state"] = value;
                }
                value = data["material"];
                if (typeof (value) == "string") {
                    printerState["material"] = value;
                }

                // progress status
                for (let item of ["remaining_time", "time_elapsed", "consumed_material", "remaining_material", "current_layer", "total_layers"]) {
                    value = data[item];
                    if (value) {
                        newProgress_status[item] = value;
                    } else {
                        newProgress_status[item] = 0;
                    }
                }
                
                // progress bar
                value = data["project_name"];
                newProgress_bar["project_name"] = value ? value : "";
                value = data["progress"];
                newProgress_bar["progress"] = value ? value : 0;


                if (Object.keys(printerState).length > 0) {
                    updateData({
                        printer_state: printerState,
                        progress_bar: newProgress_bar,
                        progress_status: newProgress_status,
                        temperatures: [newTemps]
                    });
                }
            }).catch(e => clearData());
    }
}