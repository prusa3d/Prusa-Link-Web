// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import getElement from "../../../helpers/get_element";

export class Dropdown {
  /** @param {string} val */
  set value(val) {
    this._value = val;
    this.updateLabel();
  };

  get value() {
    return this._value;
  };

  constructor(btn, label, ul) {
    /** @type {HTMLElement} */
    this._label = label;
    /** @type {HTMLElement} */
    this._ul = ul;
    /** @type {string} */
    this._value = label.innerHTML;
    /** @type {boolean} */
    this.is_open = false;

    /** @type {(value:String) => void} **/
    this.onselect = undefined;

    const closeClick = () => {
      this.close();
      window.removeEventListener("click", closeClick);
    };

    // Fix bug with instant close / or multiple dropdowns opened
    const closeReady = () => {
      window.addEventListener("click", closeClick);
      window.removeEventListener("pointerup", closeReady);
    }

    btn.onclick = (e) => {
      e.preventDefault();
      if (this.is_open) {
        this.close();
      } else {
        this.open();
        window.addEventListener("pointerup", closeReady)
      }
    };
  }

  /** Replace input element with dropdown.
   * @param {(HTMLElement|string|undefined)} root Root element - from that element
   * the search for input element begins. Pass HTMLElement (ref), string (id) or
   * undefined (body).
   * @returns {Dropdown | undefined} Returns undefined if it fails.
   */
  static init(root) {
    let rootElement = getElement(root);

    const template = document.getElementById("dropdown-template");
    const select = rootElement.querySelector('select[data-type="dropdown"]');

    if (!select)
      return undefined;

    select.after(document.importNode(template.content, true));
    const dropdown = select.nextElementSibling;
    select.remove();

    const btn = dropdown.querySelector(".dropdown-btn");
    const label = btn.querySelector(".dropdown-label");
    const ul = dropdown.querySelector(".dropdown-content ul");

    if (!btn || !label || !ul) {
      if (process.env.MODE == "development") {
        console.error("Error while reading dropdown template");
      }
      return undefined;
    }

    return new Dropdown(btn, label, ul);
  }

  setOptions(options) {
    options.forEach(option => {
      const li = document.createElement("li");
      li.innerHTML = option;
      li.onclick = () => {
        this.select(option);
        if (this.onselect)
          this.onselect(option);
        this.close();
      }
      this._ul.appendChild(li);
    });
  }

  updateLabel() {
    this._label.innerHTML = this._value;
  }

  select(option) {
    this._label.innerHTML = option;
  }

  open() {
    if (!this._ul.classList.contains("open"))
      this._ul.classList.add("open");
    this.is_open = true;
  };

  close() {
    this._ul.classList.remove(["open"]);
    this.is_open = false;
  };
};