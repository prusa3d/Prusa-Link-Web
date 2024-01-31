// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { handleError } from "../components/errors";
import { doQuestion } from "../components/question";
import { translate } from "../../locale_provider";
import printer from "..";
// import { setBusy } from "../components/busy";

const repeatInterval = 250; // milliseconds, how often should the value be updated when holding the button
let effectiveRepeatInterval = repeatInterval; // Will be dynamically shortened to create an acceleration effect
let pressed = false;
/**
 * id: translations, limits
 */
const config = {
  exposureTime: {
    text: translate("exp-times.exp-time"),
    limit: [1000, 60000],
    step: 100,
  },
  exposureTimeCalibration: {
    text: translate("exp-times.inc"),
    limit: [100, 5000],
    step: 100,
  },
  exposureTimeFirst: {
    text: translate("exp-times.layer-1st"),
    limit: [10000, 120000],
    step: 1000,
  },
  exposureUserProfile: {
    text: translate("exp-times.profile"),
    limit: [0, 2],
    step: 1,
  },
};

const getPressed = () => pressed;

const setValue = (item_name, value, min, max, step) => {
  const setValueTo = () => {
    if (getPressed()) {
      const newValue = parseInt(value.dataset.value) + step;
      if (min <= newValue && newValue <= max) {
        value.dataset.value = newValue;
        if (item_name == "exposureUserProfile") {
            switch(parseInt(value.dataset.value)) {
            case 0:
                value.innerHTML = translate("exp-times.faster");
                break;
            case 1:
                value.innerHTML = translate("exp-times.slower");
                break;
            case 2:
                value.innerHTML = translate("exp-times.high-viscosity")
                break;
            default:
                value.innerHTML = translate("exp-times.faster")
            }
        }
        else value.innerHTML = (newValue / 1000).toFixed(1);
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
const setUpElements = (job, elements, div) => {
  const template = document.getElementById("exposure-item").content;
  const file = job.file;
  div.className = "modal-exposure";
  for (let expo in config) {
    if (expo in job && job[expo] !== undefined) {
      const elm = document.importNode(template, true);
      var minus = elm.getElementById("minus");
      var plus = elm.getElementById("plus");
      elm.getElementById("desc").innerHTML = config[expo].text;
      const value = elm.getElementById("value");
      value.dataset.value = job[expo].toFixed(0);
      if (expo == "exposureUserProfile") {
        switch(parseInt(job[expo])) {
            case 0:
                value.innerHTML = translate("exp-times.faster");
                break;
            case 1:
                value.innerHTML = translate("exp-times.slower");
                break;
            case 2:
                value.innerHTML = translate("exp-times.high-viscosity")
                break;
            default:
                value.innerHTML = translate("exp-times.faster")
            }
        minus.style.display = "none";
        plus.style.display = "none";
        minus = elm.getElementById("previous");
        plus = elm.getElementById("next");
        minus.style.display = "block";
        plus.style.display = "block";
      } else value.innerHTML = (job[expo] / 1000).toFixed(1);
      const [min, max] = config[expo].limit;
      const setMinus = setValue(expo, value, min, max, -config[expo].step);
      minus.onclick = setMinus;
      minus.onmousedown = () => {
        pressed = true;
        setMinus();
      };
      minus.onmouseup = () => {
        pressed = false;
        effectiveRepeatInterval = repeatInterval;
      };
      const setPlus = setValue(expo, value, min, max, config[expo].step);
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
const changeExposureTimesQuestion = (job) => {
  const context = printer.getContext();
  const page = window.location.hash;
  history.pushState(null, document.title, page);
  const elements = {};
  const div = document.createElement("div");
  setUpElements(job, elements, div);
  doQuestion({
    title: translate("btn.chg-print-set"),
    questionChildren: [div],
    yes: (close) => {
      // setBusy();
      const result = {};
      for (let expo in elements) {
        result[expo] = parseInt(elements[expo].dataset.value);
      }

      getJson("/api/system/commands/custom/changeexposure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result),
      })
        .then(() => context.updateJobDetails())
        .catch((result) => handleError(result))
        .finally(() => close());
    },
    yesText: translate("btn.save-chgs"),
    noText: translate("btn.cancel"),
    next: page,
  });
};

export default changeExposureTimesQuestion;
