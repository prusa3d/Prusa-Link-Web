// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { translateLabels } from "../../locale_provider";

const modalData = {
  count: 0,
  current: 0,
};

/**
 * Show modal
 * @param {function} createElement (close) => {} return a dom element to show
 * @param {dict} options { timeout: number, closeOutside: bool, closeCallback: func
 */
const modal = (createElement, options = {}) => {
  const config = Object.assign({ timeout: 5500, closeOutside: true }, options);
  const count = modalData.count;
  modalData.count = modalData.count + 1;
  const modalBox = document.querySelector(".modal-box");
  const modalWrapper = modalBox.parentElement;

  while (modalBox.firstChild) {
    modalBox.removeChild(modalBox.firstChild);
  }

  const removeModal = () => {
    if (
      count == modalData.current &&
      modalWrapper.classList.contains("show-modal")
    ) {
      modalWrapper.classList.remove("show-modal");
      if (config.closeCallback) {
        config.closeCallback();
      }
    }
  };

  const windowOnClick = (event) => {
    if (event.target === modalWrapper) {
      removeModal();
    }
  };

  // close when click outside
  if (config.closeOutside) {
    window.addEventListener("click", windowOnClick);
  }

  const node = createElement(removeModal);
  modalData.current = count;
  modalBox.appendChild(node);
  translateLabels(modalBox);
  modalWrapper.classList.add("show-modal");
  // for default all modal there is a timeout
  if (config.timeout > 0) {
    setTimeout(removeModal, config.timeout);
  }
};

export { modal };
