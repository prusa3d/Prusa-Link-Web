// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";

/**
 * Control printhead movement in XYZ axes.
 * @param {{
 *  x: number | undefined,
 *  y: number | undefined,
 *  z: number | undefined,
 * }} axes
 */
export const movePrinthead = (axes) =>
  getJson("/api/printer/printhead", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({

        command: "jog",
        ...axes,

    }),
  });

/**
 * Homes the print head in all of the given axes.
 * @param {string[]} axes A list of axes which to home, valid values
 * are one or more of x, y, z.
 */
export const homePrinthead = (axes) =>
  getJson("/api/printer/printhead", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      command: "home",
      axes,
    }),
  });

/**
 * Control extruder.
 * @param {number} amount
 */
export const extrude = (amount) =>
  getJson("/api/printer/tool", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({

        command: "extrude",
        amount,

    }),
  });

/**
 * Control extruder.
 * @param {number} amount
 */
export const retract = (amount) => getJson("/api/printer/tool", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({

      command: "extrude",
      amount: -amount,

  }),
});

/**
 * Control extruder.
 * @param {number} amount Amount in percent.
 */
export const setFlowRate = (factor) =>
  getJson("/api/printer/tool", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({

        command: "flowrate",
        factor,

    }),
  });

/**
  * Control bed temperature
  * @param {number} target
  */
export const setBedTemperature = (target) =>
  getJson("/api/printer/bed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      command: "target",
      target,
    }),
  });

/**
  * Control nozzle temperature
  * @param {number} target
  */
export const setNozzleTemperature = (target) =>
  getJson("/api/printer/tool", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({

        command: "target",
        targets: {
          tool0: target
        },

    }),
  });

/**
 * Set target print speed.
 * @param {number} target
 */
export const setSpeed = (target) =>
  getJson("/api/printer/printhead", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({

        command: "speed",
        factor: target,

    }),
  });