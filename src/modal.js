// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Show modal
 * @param {string} templateId modal id template to show
 * @param {dict} options { timeout: number, closeOutside: bool, closeCallback: func, actions: {event: {id:func}}}
 */
const load = (templateId, options = {}) => {
  const config = Object.assign(
    { timeout: 5500, closeOutside: true, events: {} },
    options
  );
  const template = document.getElementById(`modal-${templateId}`);
  const node = document.importNode(template.content, true);
  const modalBox = document.querySelector(".modal-box");
  const modal = modalBox.parentElement;

  while (modalBox.firstChild) {
    modalBox.removeChild(modalBox.firstChild);
  }

  const removeModal = () => {
    if (modal.classList.contains("show-modal")) {
      modal.classList.remove("show-modal");
      if (config.closeCallback) {
        config.closeCallback();
      }
    }
  };

  const windowOnClick = (event) => {
    if (event.target === modal) {
      removeModal();
    }
  };

  // if have button close add event listener
  let closeButton = node.querySelector(".close-button");
  if (closeButton) {
    closeButton.addEventListener("click", removeModal);
  }

  // close when click outside
  if (config.closeOutside) {
    window.addEventListener("click", windowOnClick);
  }

  // add a listener for each button by id
  for (var eventName in config.events) {
    let actions = config.events[eventName];
    for (var actionId in actions) {
      let actionButton = node.getElementById(actionId);
      actionButton.addEventListener(eventName, (event) =>
        actions[actionId](event, removeModal)
      );
    }
  }

  modalBox.appendChild(node);
  modal.classList.add("show-modal");
  // for default all modal there is a timeout
  if (config.timeout > 0) {
    setTimeout(removeModal, config.timeout);
  }
};

export default { load };
