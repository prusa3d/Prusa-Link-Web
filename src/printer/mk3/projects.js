// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../auth";
import { updateTitles } from './index';

const load = () => {
  console.log("load Projects Logic - mk3");
  updateTitles();

  getJson("/api/files", (status, data) => {
    if (status.ok) {
      console.log(data);
      showRoot(data.files)
    }
  });
};

const showRoot = (files) => { // TODO: show files based on their types
  const projectsElement = document.getElementById("projects");

  files.forEach(file => {
    const template = document.getElementById("projects-folder-template");
    const node = document.importNode(template.content, true);

    projectsElement.appendChild(node);
    const el = document.getElementById('projects').lastElementChild;
    el.getElementsByClassName('folder-name')[0].innerHTML = file.origin;
    el.onclick = () => {
      getJson(file.refs.resource, (status, data) => {
        if (status.ok) {
          console.log(data);
          showDir(data)
        }
      });
    }
  });
}

const showDir = (file) => {
  const projectsElement = document.getElementById("projects");
  projectsElement.innerHTML = "";

  const template = document.getElementById("projects-folder-template");
  const node = document.importNode(template.content, true);

  projectsElement.appendChild(node);
  const el = document.getElementById('projects').lastElementChild;
  el.getElementsByClassName('folder-name')[0].innerHTML = file.display;
  el.onclick = () => {
    showChildren(file.children);
  }
}

const showChildren = (files) => {
  const projectsElement = document.getElementById("projects");
  projectsElement.innerHTML = "";

  files.forEach(file => {
    if (file.type === "machinecode") {
      const template = document.getElementById("projects-file-template");
      const node = document.importNode(template.content, true);

      projectsElement.appendChild(node);
      const el = document.getElementById('projects').lastElementChild;
      el.getElementsByClassName('file-name')[0].innerHTML = file.display;
      el.getElementsByClassName('file-print-time')[0].innerHTML = file.gcodeAnalysis.estimatedPrintTime || "-";
      el.getElementsByClassName('file-material')[0].innerHTML = file.gcodeAnalysis.material || "-";
      el.getElementsByClassName('file-layer-height')[0].innerHTML = file.gcodeAnalysis.layerHeight || "-";
    }
  })
}

export default { load };
