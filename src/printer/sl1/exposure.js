// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { handleError } from "../components/errors";
import { doQuestion } from "../components/question";
import { navigateToProjects } from "../components/projects";
import { translate } from "../../locale_provider";
import { setBusy } from "../components/busy";

const repeatInterval = 250; // milliseconds, how often should the value be updated when holding the button
let effectiveRepeatInterval = repeatInterval; // Will be dynamically shortened to create an acceleration effect
let pressed = false;
/**
 * id: translations, limits
 */
const config = {
  exposureTime: {
    text: translate("exp-times.exp-time"),
    limit: [1, 60],
    step: 0.1,
  },
  exposureTimeFirst: {
    text: translate("exp-times.layer-1st"),
    limit: [10, 120],
    step: 0.1,
  },
  exposureTimeCalibration: {
    text: translate("exp-times.inc"),
    limit: [0.5, 5],
    step: 0.5,
  },
};

const getPressed = () => pressed;

const setValue = (value, min, max, tax) => {
  const setValueTo = () => {
    if (getPressed()) {
      const newValue = parseFloat(value.innerHTML) + tax;
      if (min <= newValue && newValue <= max) {
        value.innerHTML = newValue.toFixed(1);
      }
    }
    if (getPressed()) {
      effectiveRepeatInterval = effectiveRepeatInterval * 0.9;
      setTimeout(setValueTo, effectiveRepeatInterval);
    }
  };

  return setValueTo;
};

/**
 * Create HTMLDivElement to append in the question, return a dict of elements to set up buttons
 * @param {object} file - job file information
 * @param {object} elements - {id: HTMLElement}
 * @param {HTMLDivElement} div html element to insert in modal
 */
const setUpElements = (file, elements, div) => {
  const template = document.getElementById("exposure-item").content;
  div.className = "modal-exposure";
  for (let expo in config) {
    if (file[expo]) {
      const elm = document.importNode(template, true);
      elm.getElementById("desc").innerHTML = config[expo].text;
      const value = elm.getElementById("value");
      value.innerHTML = file[expo] / 1000;
      const [min, max] = config[expo].limit;
      const minus = elm.getElementById("minus");
      const setMinus = setValue(value, min, max, -config[expo].step);
      minus.onclick = setMinus;
      minus.onmousedown = () => {
        pressed = true;
        setMinus();
      };
      minus.onmouseup = () => {
        pressed = false;
        effectiveRepeatInterval = repeatInterval;
      };
      const plus = elm.getElementById("plus");
      const setPlus = setValue(value, min, max, config[expo].step);
      plus.onclick = setPlus;
      plus.onmousedown = () => {
        pressed = true;
        setPlus();
      };
      plus.onmouseup = () => {
        pressed = false;
        effectiveRepeatInterval = repeatInterval;
      };
      elements[expo] = value;
      div.appendChild(elm);
    }
  }
};

/**
 * Create a question for set up the exposure times
 * @param {object} file - job file information
 */
const changeExposureTimesQuestion = (file, next = "#preview") => {
  const btn = document.getElementById("exposure");
  btn.disabled = false;
  btn.addEventListener("click", (e) => {
    navigateToProjects();
    const elements = {};
    const div = document.createElement("div");
    setUpElements(file, elements, div);
    doQuestion({
      title: translate("exp-times.title"),
      questionChildren: [div],
      yes: (close) => {
        setBusy();
        const result = {};
        for (let expo in elements) {
          result[expo] = parseFloat(elements[expo].innerHTML) * 1000;
        }

        getJson("/api/system/commands/custom/changeexposure", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(result),
        })
          .catch((result) => handleError(result))
          .finally((result) => close());
      },
      yesText: translate("btn.save-chgs"),
      noText: translate("btn.cancel"),
      next,
    });
  });
};

export default changeExposureTimesQuestion;
