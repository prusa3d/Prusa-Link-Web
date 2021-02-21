// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const modalData = {
  count: 0,
  current: 0,
};

/**
 * Show modal
 * @param {string} templateId modal id template to show
 * @param {dict} options { timeout: number, closeOutside: bool, closeCallback: func, actions: {event: {id:func}}}
 */
const modal = (templateId, options = {}) => {
  const config = Object.assign(
    { timeout: 5500, closeOutside: true, events: {}, insert: {} },
    options
  );
  const count = modalData.count;
  modalData.count = modalData.count + 1;
  const template = document.getElementById(`modal-${templateId}`);
  const node = document.importNode(template.content, true);
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

  // if have button close add event listener
  let closeButton = node.querySelector(".close-button");
  if (closeButton) {
    closeButton.addEventListener("click", removeModal);
  }

  // close when click outside
  if (config.closeOutside) {
    window.addEventListener("click", windowOnClick);
  }

  // add innerHTML
  for (var queryName in config.insert) {
    const content = config.insert[queryName];
    if (Array.isArray(content)) {
      content.forEach((e) => node.querySelector(queryName).appendChild(e));
    } else {
      node.querySelector(queryName).innerHTML = content;
    }
  }

  // add a listener for each button by id
  for (var eventName in config.events) {
    let actions = config.events[eventName];
    for (var actionId in actions) {
      let actionButton = node.getElementById(actionId);
      const action = actions[actionId];
      actionButton.addEventListener(eventName, (event) =>
        action(event, removeModal)
      );
    }
  }

  modalData.current = count;
  modalBox.appendChild(node);
  modalWrapper.classList.add("show-modal");
  // for default all modal there is a timeout
  if (config.timeout > 0) {
    setTimeout(removeModal, config.timeout);
  }
};

export { modal };
