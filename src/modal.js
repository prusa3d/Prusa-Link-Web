// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Show modal
 * @param {string} templateId modal id template to show
 * @param {dict} options { timeout, cb: callback function}
 */
const load = (templateId, options = {}) => {
  const config = Object.assign({ timeout: 5500 }, options);
  const template = document.getElementById(`modal-${templateId}`);
  const node = document.importNode(template.content, true);
  const modalElement = document.querySelector(".modal-box");

  while (modalElement.firstChild) {
    modalElement.removeChild(modalElement.firstChild);
  }

  const removeModal = () => {
    modalElement.parentElement.classList.remove("show-modal");
    if (config.cb) {
        config.cb();
    }
  };

  const windowOnClick = (event) => {
    if (event.target === modalElement.parentElement) {
      removeModal();
    }
  };

  let closeButton = node.querySelector(".close-button");
  if (closeButton) {
    closeButton.addEventListener("click", removeModal);
  }

  window.addEventListener("click", windowOnClick);

  modalElement.appendChild(node);
  modalElement.parentElement.classList.add("show-modal");
  if (config.timeout > 0) {
    setTimeout(removeModal, config.timeout);
  }
};

export default { load };
