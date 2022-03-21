// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

class TabsController {
  get selected() { return this._selected; }
  get isLocked() { return this._isLocked; }

  lock() {
    this._isLocked = true;
    this._root.querySelectorAll("[data-tab-btn]").forEach(btn => {
      if (btn.getAttribute("data-tab-btn") !== this.selected)
        btn.setAttribute("locked", true);
    })
  }

  unlock() {
    this._isLocked = false;
    this._root.querySelectorAll("[data-tab-btn]").forEach(btn => {
      if (btn.hasAttribute("locked"))
        btn.removeAttribute("locked");
    })
  }

  constructor() {
    /** @type {HTMLElement | null} */
    this._root = null;
    /** @type {String | null} */
    this._selected = null;
    /** @type {boolean} */
    this._isLocked = false;
  }

  init(root) {
    this._root = root;
    root.querySelectorAll("[data-tab-btn]").forEach(btn => {
      btn.onclick = () => {
        if (!this._isLocked) {
          const tab = btn.getAttribute("data-tab-btn");
          if (tab === this._selected) {
            // this.closeTab();
          } else {
            this.closeTab();
            this.openTab(tab);
          }
        }
      }
    })

    this.openTab(this._selected, true);
  }

  /**
   * Open tab
   * @param {String} tab data-tab attribute
   */
  openTab(tab) {
    if (tab) {
      const tabElm = this._root.querySelector(`[data-tab="${tab}"]`);
      if (tabElm)
        tabElm.setAttribute("opened", true);

      const btnElm = this._root.querySelector(`[data-tab-btn="${tab}"]`);
      if (btnElm)
        btnElm.setAttribute("selected", true);

      this._selected = tab;
    }
  }

  /**
   * Close selected tab
   */
  closeTab() {
    if (this._selected) {
      const tabElm = this._root.querySelector(`[data-tab="${this._selected}"]`);
      console.log(tabElm);
      if (tabElm)
        tabElm.setAttribute("opened", false);

      const btnElm = this._root.querySelector(`[data-tab-btn="${this._selected}"]`);
      if (btnElm)
        btnElm.setAttribute("selected", false);

      this._selected = null;
    }
  }
}

export default TabsController;
