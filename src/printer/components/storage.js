// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { translate, translateLabels } from "../../locale_provider.js";
import { onOutsideClick, setVisible } from "../../helpers/element.js";
import { updateProgressBar } from "./progressBar.js";
import formatData from "./dataFormat.js";

/**
 * @param {Object} context Printer context.
 * @param {Object[]} storages List of available storages.
 * @param {String} selectedOrigin Currently selected storage.
 * @param {(String) => void} onSelect Callback when select storage.
 */
const load = () => {
  const dropdownBtn = document.querySelector("#node-storage .storage-select-btn");
  if (dropdownBtn) {
    dropdownBtn.onclick = (e) => {
      e.stopPropagation();
      toggleDropdown(dropdownBtn, dropdownContent);
    };
  }
};

const update = (storages, selectedStorage, onSelect, updateDetails = false) => {
  const dropdown = document.querySelector(".storage-select-content");
  const tabs = document.querySelectorAll(".storage-select-content li");

  tabs.forEach((tab) => {
    const storageType = tab.getAttribute("data-storage");
    let isVisible = false;
    if (storageType in storages) {
      const storage = storages[storageType];
      const label = tab.querySelector("p");

      isVisible = true;
      label.innerText = storage.name;

      tab.setAttribute("selected", storageType === selectedStorage);

      tab.onclick = (e) => {
        e.stopPropagation();
        updateDropdownBtnContent(tab.innerHTML);
        updateTabsSelection(storageType);
        dropdown.classList.remove("open");
        updateStorageDetails(storage);
        onSelect(storageType);
      };
    }
    setVisible(tab, isVisible);
  });

  if (updateDetails) {
    updateStorageDetails(storages[selectedStorage]);
  }
};

const updateTabsSelection = (storageType) => {
  const tabs = document.querySelectorAll(".storage-select-content li");
  if (tabs) {
    tabs.forEach((tab) =>
      tab.setAttribute(
        "selected",
        tab.getAttribute("data-storage") === storageType
      )
    );
  }
};

const updateDropdownBtnContent = (content) => {
  const dropdownBtn = document.querySelector(
    "#node-storage .storage-select-btn-inner"
  );
  if (dropdownBtn) {
    dropdownBtn.innerHTML = content;
  }
};

const toggleDropdown = (dropdownBtn, dropdownContent) => {
  if (!dropdownBtn || !dropdownContent) return;
  dropdownContent.classList.toggle("open");
  onOutsideClick(
    () => {
      dropdownContent?.classList.remove("open");
    },
    dropdownBtn,
    dropdownContent
  );
};

const updateStorageDetails = (storage) => {
  const elm = document.querySelector(".node-storage-space");
  if (!elm) return;

  const isVisible = storage.available && !!storage.totalSpace;
  setVisible(elm, isVisible);

  if (isVisible) {
    const free = storage.freeSpace;
    const total = storage.totalSpace;
    const used = total - free;
    const pct = Math.round((total ? used / total : 0) * 100);
    const space = translate("prop.storage-used-space", {
      used: formatData("size", used),
      free: formatData("size", free),
      total: formatData("size", total),
    });
    updateProgressBar(elm, pct);
    document.getElementById("storage-pct").innerHTML = formatData(
      "percent",
      pct
    );
    document.getElementById("storage-space").innerHTML = space;
  }
};

export default { load, update };
