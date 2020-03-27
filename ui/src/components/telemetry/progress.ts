// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

let progressStatus;
if (process.env.IS_SL1) {
  progressStatus = [
    "remaining_time",
    "time_elapsed",
    "consumed_material",
    "remaining_material",
    "current_layer",
    "total_layers",
    "progress"
  ];
} else {
  progressStatus = [
    "pos_z_mm",
    "printing_speed",
    "flow_factor",
    "print_dur",
    "time_est",
    "filament_status",
    "progress"
  ];
}

export function update(updateData, clearData) {
  return () => {
    fetch("/api/progress", {
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
        const newProgress_status = {};
        let value = null;

        // progress status
        for (let item of progressStatus) {
          value = data[item];
          if (value) {
            newProgress_status[item] = value;
          } else {
            newProgress_status[item] = 0;
          }
        }

        if (Object.keys(newProgress_status).length > 0) {
          updateData(newProgress_status);
        }
      })
      .catch(e => clearData());
  };
}

export function updateProjectName(updateData) {
  fetch("/api/project-name", {
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
      const value = data["project_name"];
      const project_name = value ? value : "";
      updateData({ project_name });
    })
    .catch(e => updateData({ project_name: "" }));
}
