// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { translate } from "../../locale_provider";
import { setDisabled, setEnabled } from "../../helpers/element";
import updateProperties from "./updateProperties";
import { disableSteppers, extrude, homePrinthead, movePrinthead, retract, setBedTemperature, setFlowRate, setNozzleTemperature, setSpeed } from "./controlActions";
import { handleError } from "./errors";

let moveStep = 1;
let extrudeRetractStep = 1;

const load = (context) => {
  translate("control.title", { query: "#title-status-label" });
  initInputs(document.querySelector("#control"));
  initSteps(
    document.querySelector("#control #move-step"),
    moveStep,
    (value) => moveStep = value,
  );
  initSteps(
    document.querySelector("#control #extrude-retract-step"),
    extrudeRetractStep,
    (value) => extrudeRetractStep = value,
  );
  initButtons();
  initHeatedBedMovement();
  initNozzleMovement();

  update(context);
};

const update = (context) => {
  updateProperties("control", {
    temperature: context.printer.temperature,
    telemetry: context.printer.telemetry,
    job: context.current,
  });
  updateButtons(context.printer.state, context.printer.telemetry, context.version);
}

function initButtons() {
  initDisableSteppersBtn();
  initExtrudeBtn();
  initRetractBtn();
}

function initDisableSteppersBtn() {
  const btn = document.querySelector("#control #disable-steppers");
  if (btn)
    btn.onclick = () => {
      disableSteppers()
        .catch((result) => handleError(result));
    };
}

function updateButtons(state, telemetry, info) {
  const controls = document.querySelectorAll("#control button");
  const nozzleControls = ["extrude", "retract"];
  const whitelistWhenPrinting = [
    "flowrate",
    "bed",
    "nozzle",
    "speed"
  ];

  const whitelistWhenPaused = [
    ...whitelistWhenPrinting,
    ...nozzleControls,
    "move-step",
    "extrude-retract-step",
    "heated-bed-xy-move",
  ];

  if (state.flags.printing || state.flags.pausing || state.flags.paused) {
    const whitelist = state.flags.paused ? whitelistWhenPaused : whitelistWhenPrinting;
    controls.forEach(btn => {
      const controlId =  btn.id || btn.parentNode.id || btn.parentNode.parentNode.id;
      setDisabled(btn, !whitelist.includes(controlId));
    });
  }

  const canControlNozzle = (telemetry && info && telemetry["temp-nozzle"] >= info["min_extrusion_temp"]);

  nozzleControls.forEach(
    control => setDisabled(document.getElementById(control), !canControlNozzle)
  );
}

function initExtrudeBtn() {
  const btn = document.querySelector("#control #extrude");
  if (btn) {
    btn.onclick = () => {
      extrude(extrudeRetractStep)
        .catch((result) => handleError(result));
    }
  }
}

function initRetractBtn() {
  const btn = document.querySelector("#control #retract");
  if (btn) {
    btn.onclick = () => {
      retract(extrudeRetractStep)
        .catch((result) => handleError(result));
    }
  }
}

function dirToMovementAxes(direction) {
  const negative = direction.includes("-");
  const axis = direction.replace(RegExp("[+-]"), "");
  if (!axis) {
    console.error(`"${direction}" is not valid direction`);
    return {};
  }

  return { [axis]: negative ? -moveStep : moveStep };
}

/**
 * Move print head
 * @param {"move" | "home"} action
 * @param {string | string[]} value For `move` action pass single axis for example: "x+".
 For home action pass array - for example: ["x", "y"].
 */
function printHeadAction(action, value) {
  if (action === "move") {
    const axes = dirToMovementAxes(value);
    movePrinthead(axes).catch((result) => handleError(result));
  } else if (action === "home") {
    const axes = value.split(",");
    homePrinthead(axes).catch((result) => handleError(result));
  }
}

function initHeatedBedMovement() {
  const root = document.querySelector("#control #heated-bed-xy-move");
  if (root) {
    root.querySelectorAll("button[data-action]").forEach(btn => {
      btn.onclick = () => {
        const action = btn.getAttribute("data-action");
        const value = btn.getAttribute("data-value");
        printHeadAction(action, value);
      };
    });
  }
}

function initNozzleMovement() {
  const root = document.querySelector("#control #nozzle-z-move");
  if (root) {
    root.querySelectorAll("button[data-action]").forEach(btn => {
      btn.onclick = () => {
        const action = btn.getAttribute("data-action");
        const value = btn.getAttribute("data-value");
        printHeadAction(action, value);
      }
    });
  }
}

/**
 * Init inputs
 * @param {HTMLElement} root Root element to search from
 */
function initInputs(root) {
  function setPrinterProperty(property, value) {
    switch (property) {
      case "bed": return setBedTemperature(value);
      case "flowrate": return setFlowRate(value);
      case "nozzle": return setNozzleTemperature(value);
      case "speed": return setSpeed(value);
      default: throw Error("Unknown property!");
    }
  }

  if (root) {
    root.querySelectorAll(".input-wrapper").forEach((wrapper) => {
      const input = wrapper.querySelector("input");
      const btn = wrapper.querySelector("button");
      if (input) {
        const submit = () => {
          const property = input.getAttribute("data-action");
          const value = Number.parseFloat(input.value);
          if (isNaN(value))
            return; // TODO: Display error or something when value is not a number

          setPrinterProperty(property, value).then((result) => {
            input.value = "";
          }).catch((result) => handleError(result));
        }

        input.onkeyup = (event) => {
          if (event.key === "Enter") {
            submit();
            input.blur(); // unfocus
          }
        }
        if (btn) {
          btn.onclick = submit;
        }
      }
    })
  }
}


/**
 * Init steps [mm]
 * @param {HTMLElement} root Root element to search from
 * @param {number} selectedValue Selected value
 * @param {function (number)} onSelect Callback
 */
function initSteps(root, selectedValue, onSelect) {
  function getValue(element) {
    return Number.parseFloat(element.getAttribute("data-step"));
  }

  if (root) {
    const buttons = root.querySelectorAll("button[data-step]");

    /**
     * Highlight and disable selected button
     * @param {number} _selectedValue Value, that is currently selected.
     */
    const select = (_selectedValue) => {
      buttons.forEach(_btn => {
        const _value = getValue(_btn);
        if (_value === _selectedValue) {
          setDisabled(_btn);
          _btn.setAttribute("selected", true);
        } else {
          setEnabled(_btn);
          if (_btn.hasAttribute("selected"))
            _btn.removeAttribute("selected");
        }
      })
    }

    buttons.forEach(btn => {
      const value = getValue(btn);
      if (isNaN(value))
        return;

      btn.onclick = () => {
        select(value);
        onSelect(value);
      };
    });

    select(selectedValue);
  }
}

export default { load, update };
