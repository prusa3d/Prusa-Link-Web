// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { handleError } from "../components/errors";
import { doQuestion } from "../components/question";
import { navigate } from "../../router.js";
import { translate } from "../../locale_provider";

/**
 * id: translations, limits
 */
const translations = {
  exposureTime: { text: translate("exp-times.exp-time"), limit: [1, 60] },
  exposureTimeFirst: {
    text: translate("exp-times.layer-1st"),
    limit: [10, 120],
  },
  exposureTimeCalibration: {
    text: translate("exp-times.inc"),
    limit: [0.5, 5],
  },
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
  for (let expo in translations) {
    if (file[expo]) {
      const elm = document.importNode(template, true);
      elm.getElementById("desc").innerHTML = translations[expo].text;
      const value = elm.getElementById("value");
      value.innerHTML = file[expo] / 1000;
      const [min, max] = translations[expo].limit;
      elm.getElementById("minus").addEventListener("click", (e) => {
        e.stopPropagation();
        const newValue = parseFloat(value.innerHTML) - 0.5;
        if (min <= newValue && newValue <= max) {
          value.innerHTML = newValue;
        }
      });
      elm.getElementById("plus").addEventListener("click", (e) => {
        e.stopPropagation();
        const newValue = parseFloat(value.innerHTML) + 0.5;
        if (min <= newValue && newValue <= max) {
          value.innerHTML = newValue;
        }
      });
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
    navigate("#projects");
    document.title = process.env.TITLE + " - " + translate("proj.link");
    history.pushState(null, document.title, "#projects");
    const elements = {};
    const div = document.createElement("div");
    setUpElements(file, elements, div);
    doQuestion({
      title: translate("exp-times.title"),
      questionChildren: [div],
      yes: (close) => {
        navigate("#loading");
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
