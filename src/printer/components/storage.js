// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { translate, translateLabels } from "../../locale_provider.js";
import { onOutsideClick, setVisible } from "../../helpers/element.js";
import { updateProgressBar } from "./progressBar.js";
import formatData from "./dataFormat.js";

/**
 * @param {Object} context Printer context.
 * @param {String[]} origins List of available origins.
 * @param {String} selectedOrigin Currently selected storage.
 * @param {(String) => void} onSelect Callback when select storage.
 */
const load = (context, origins, selectedOrigin, onSelect) => {
  const elm = document.getElementById("node-storage");
  if (!elm)
    return;

  const dropdownBtn = elm.querySelector(".storage-select-btn");
  dropdownBtn.onclick = (e) => {
    e.stopPropagation();
    toggleDropdown(dropdownBtn, dropdownContent);
  }

  const dropdownContent = elm.querySelector(".storage-select-content");
  dropdownContent.querySelectorAll("li").forEach(li => {
    const origin = li.getAttribute("data-origin");
    if (!origin)
      return;

    const available = origins.includes(origin);
    console.log("available", available)
    setVisible(li, available);
    if (!available)
      return;

    const location = li.getAttribute("data-location");
    const storageInfo = context.printer.storage?.[location];
    console.log("selectedOrigin", selectedOrigin)
    const isSelected = origin === selectedOrigin;
    li.setAttribute("selected", isSelected); // for pc
    li.onclick = (e) => {
      e.stopPropagation();
      updateDropdownBtnContent(dropdownBtn, li.innerHTML);
      dropdownContent.classList.remove("open");
      onSelect(origin);
    }
    if (isSelected) {
      updateStorageDetails(elm, storageInfo);
    }
  })
  const selectedLi = dropdownContent.querySelector("li[selected=true]");
  if (selectedLi && dropdownBtn)
    updateDropdownBtnContent(dropdownBtn, selectedLi.innerHTML);

  translateLabels(elm);
};

const updateDropdownBtnContent = (root, content) => {
  const btnInner = root?.querySelector(".storage-select-btn-inner");
  if (btnInner) {
    btnInner.innerHTML = content;
  }
}

const toggleDropdown = (dropdownBtn, dropdownContent) => {
  if (!dropdownBtn || !dropdownContent)
    return;
  dropdownContent.classList.toggle("open");
  onOutsideClick(() => {
    dropdownContent?.classList.remove("open");
  }, dropdownBtn, dropdownContent);
}

const updateStorageDetails = (root, storage) => {
  const elm = document.querySelector(".node-storage-space");
  if (!elm)
    return;

  const available = Boolean(storage);
  setVisible(elm, available);
  if (!available)
    return;

  const free = storage.free_space;
  const total = storage.total_space;
  const pct = 1 - ((free && total) ? free / total : 0);
  const space = translate("prop.storage-space", {
    free: formatData("size", free),
    total: formatData("size", total),
  });
  updateProgressBar(root, pct);
  root.querySelector("#storage-pct").innerHTML = formatData("progress", pct);
  root.querySelector("#storage-space").innerHTML = space;
}

export default { load };
