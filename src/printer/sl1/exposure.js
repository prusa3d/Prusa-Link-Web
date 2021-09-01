// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { handleError } from "../components/errors";
import { doQuestion } from "../components/question";
import { navigateToProjects } from "../components/projects";
import { translate } from "../../locale_provider";
import { setBusy } from "../components/busy";
import previousIcon from "../../assets/previous-icon.svg";
import nextIcon from "../../assets/next-icon.svg";

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
    limit: [0, 1],
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
        if (item_name == "exposureUserProfile")
          value.innerHTML =
            value.dataset.value == 1
              ? translate("exp-times.slower")
              : translate("exp-times.faster");
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
const setUpElements = (file, elements, div) => {
  const template = document.getElementById("exposure-item").content;
  div.className = "modal-exposure";
  for (let expo in config) {
    if (expo in file) {
      const elm = document.importNode(template, true);
      const minus = elm.getElementById("minus");
      const plus = elm.getElementById("plus");
      elm.getElementById("desc").innerHTML = config[expo].text;
      const value = elm.getElementById("value");
      value.dataset.value = file[expo].toFixed(0);
      if (expo == "exposureUserProfile") {
        value.innerHTML =
          file[expo] == 1
            ? translate("exp-times.slower")
            : translate("exp-times.faster");
        minus.src = previousIcon;
        plus.src = nextIcon;
      } else value.innerHTML = (file[expo] / 1000).toFixed(1);
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
const changeExposureTimesQuestion = (next = "#pour_resin") => {
  const btn = document.getElementById("exposure");
  btn.addEventListener("click", (e) => {
    getJson("/api/job").then((result) => {
      const data = result.data;
      var file = data.job.file;
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
            result[expo] = parseInt(elements[expo].dataset.value);
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
  });
};

export default changeExposureTimesQuestion;
