// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { translate } from "../../locale_provider.js";
import { navigate, navigateShallow } from "../../router.js";

const question = {};

/**
 * clean and leave a question page
 */
const cleanQuestion = () => {
  question.title = null;
  question.questionChildren = null;
  question.yes = null;
  question.no = null;
  navigateShallow(question.next);
};

/**
 * Create and show a page with a question / warning
 * @param {object} data
 */
export const doQuestion = (data) => {
  const newQuestion = Object.assign(
    {
      title: null,
      questionChildren: [],
      yes: (cb) => cb(),
      no: (cb) => cb(),
      yesText: translate("btn.yes"),
      noText: translate("btn.no"),
      next: "#dashboard",
    },
    data
  );
  for (let q in newQuestion) {
    question[q] = newQuestion[q];
  }
  navigateShallow("#question");
};

/**
 * load the page
 */
export const load = () => {
  if (!question.title) {
    navigate("#dashboard");
  }

  document.getElementById("title-status-label").innerHTML = question.title;

  // add innerHTML
  const node = document.getElementById("question");
  const content = question.questionChildren;
  if (Array.isArray(content)) {
    content.forEach((e) => node.appendChild(e));
  } else {
    node.innerHTML = content;
  }

  for (let actionName of ["yes", "no"]) {
    const action = document.getElementById(actionName);
    const func = question[actionName];
    action.querySelector("p").innerHTML = question[actionName + "Text"];
    action.addEventListener("click", (e) => {
      e.stopPropagation();
      func(cleanQuestion);
    });
  }
};

export default { load };
