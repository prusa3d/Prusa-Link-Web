// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import getElement from "../../../helpers/get_element";

export class Dropdown {
  /** @param {string} val */
  set value(val) {
    this._value = val;
    this.updateLabel();
  }

  get value() {
    return this._value;
  }

  constructor(btn, label, ul) {
    const dropdown = this;

    /** @type {HTMLElement} */
    this._label = label;
    /** @type {HTMLElement} */
    this._ul = ul;
    /** @type {string} */
    this._value = label.innerHTML;
    /** @type {boolean} */
    this.is_open = false;
    this._options = [];

    this._onKeyDown = (event) => {
      if (!dropdown.is_open) {
        return;
      }

      switch (event.key.toLowerCase()) {
        // close the dropdown on escape
        case "escape":
          dropdown.close();
          return;

        // select next node on arrow down
        case "arrowdown":
          let selectThis = false;
          for (const li of this._ul.childNodes) {
            if (selectThis) {
              this._highlight(li);
              break;
            }
            if (li.classList?.contains("select")) {
              selectThis = true;
            }
          }
          break;

        // select previous node on arrow up
        case "arrowup":
          let previous = null;
          for (const li of this._ul.childNodes) {
            if (li.classList?.contains("select")) {
              if (previous) {
                this._highlight(previous);
              }
              break;
            }
            previous = li;
          }
          break;

        // select current node
        case "enter":
          for (const li of this._ul.childNodes) {
            if (li.classList.contains("select")) {
              const value = li.innerText;
              this.value = value;
              if (this.onselect) this.onselect(value);
              this.close();
              break;
            }
          }
          break;
      }
      event.preventDefault();
    };

    this._onClick = (event) => {
      const target = event.target.parentNode;
      if (!dropdown.is_open) {
        return true;
      }
      if (target !== btn) {
        dropdown.close();
      }
    };

    window.addEventListener("keydown", this._onKeyDown, false);
    window.addEventListener("click", this._onClick, false);

    /** @type {(value:String) => void} **/
    this.onselect = undefined;

    btn.onclick = (e) => {
      e.preventDefault();
      if (this.is_open) {
        this.close();
      } else {
        this.open();
      }
    };
  }

  _highlight(option) {
    this._ul.childNodes.forEach((o) => {
      if (o === option) {
        o.classList.add("select");
      } else {
        o.classList.remove("select");
      }
    });
  }

  destructor() {
    window.removeEventListener("keypress", this._onKeyPress);
    window.removeEventListener("click", this._onClick);
  }

  /** Replace input element with dropdown.
   * @param {(HTMLElement|string|undefined)} root Root element - from that element
   * the search for input element begins. Pass HTMLElement (ref), string (id) or
   * undefined (body).
   * @param {(string | undefined)} id Optional element ID
   * @returns {Dropdown | undefined} Returns undefined if it fails.
   */
  static init(root, id) {
    let rootElement = getElement(root);

    const template = document.getElementById("dropdown-template");
    const select =
      rootElement.getAttribute("data-type") === "dropdown"
        ? rootElement
        : rootElement.querySelector('select[data-type="dropdown"]');

    if (!select) return undefined;

    select.after(document.importNode(template.content, true));
    const dropdown = select.nextElementSibling;
    dropdown.id = id;
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
    this._options = options;
  }

  updateLabel() {
    this._label.innerHTML = this._value;
  }

  select(option) {
    this._label.innerHTML = option;
  }

  open() {
    if (!this._ul.classList.contains("open")) {
      this._options.forEach((option) => {
        const li = document.createElement("li");
        if (option === this._value) {
          li.className = "select selected";
        }
        li.innerText = option;
        li.onclick = () => {
          this.select(option);
          this.value = option;
          if (this.onselect) this.onselect(option);
          this.close();
        };
        li.onmouseover = () => this._highlight(li);
        this._ul.appendChild(li);
      });
      this._ul.classList.add("open");
    }
    this.is_open = true;
  }

  close() {
    this._ul.classList.remove(["open"]);
    while (this._ul.firstChild) {
      this._ul.removeChild(this._ul.firstChild);
    }
    this.is_open = false;
  }
}
