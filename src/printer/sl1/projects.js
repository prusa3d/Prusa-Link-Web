// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const load = () => {
  console.log("Projects Logic - sl1");
  const nodes = [
    { type: "folder", name: "Main" },
    {
      type: "file",
      name: "Petrin_Tower_10H_50um_Prusa_Orange.sl1",
      printTime: "10 h 21 min",
      // material: "3DM-ABS",
      layerHeight: "0.05 mm",
    },
  ];

  const projects = document.querySelector(".projects");
  const templateFolder = document.getElementById("node-folder").content;
  const templateProject = document.getElementById("node-project").content;
  for (let element of nodes) {
    if (element.type == "folder") {
      const node = document.importNode(templateFolder, true);
      node.querySelector(".node").addEventListener("click", (e) => {
        console.log("Folder: " + element.name);
        e.preventDefault();
      });
      node
        .querySelector("p")
        .appendChild(document.createTextNode(element.name));
      projects.appendChild(node);
    } else {
      const node = document.importNode(templateProject, true);
      node.querySelector(".node").addEventListener("click", (e) => {
        console.log("Project: " + element.name);
        e.preventDefault();
      });
      node
        .querySelector("p")
        .appendChild(document.createTextNode(element.name));
      const nodeDetails = node.querySelector(".node-details");
      for (let property of ["printTime", "material", "layerHeight"]) {
        let elm = node.getElementById(property);
        if (element[property] != undefined) {
          let span = document.createElement("span");
          span.innerHTML = element[property];
          elm.querySelector("p").appendChild(span);
        } else {
          nodeDetails.removeChild(elm);
        }
      }
      projects.appendChild(node);
    }
  }
};

export default { load };
