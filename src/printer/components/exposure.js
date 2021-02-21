// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { modal } from "./modal.js";
import { errorFormat, handleError } from "./errors";
import { doQuestion } from "./question";

const translations = {
  exposureTime: { text: "Exposure [s]", limit: [1, 60] },
  exposureTimeFirst: { text: "First Layer Expo. [s]", limit: [10, 120] },
  exposureTimeCalibration: { text: "Exposure time incr. [s]", limit: [0.5, 5] },
};

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

const changeExposureTimesQuestion = (file) => {
  document.querySelector(".action").addEventListener("click", (e) => {
    const elements = {};
    const div = document.createElement("div");
    setUpElements(file, elements, div);
    doQuestion({
      title: "Change exposure times",
      questionChildren: [div],
      yes: (close) => {
        const result = {};
        for (let expo in elements) {
          result[expo] = parseFloat(elements[expo].innerHTML) * 1000;
        }
        const onRespond = (status, data) => {
          close();
          handleError(status, data);
        };

        getJson("/api/job", onRespond, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(result),
        });
      },
      yesText: "save changes",
      noText: "cancel",
      next: "#projects",
    });
  });
};

export default changeExposureTimesQuestion;
