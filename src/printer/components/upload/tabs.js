// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

class TabsController {
  get selected() { return this._selected; }
  get isLocked() { return this._isLocked; }

  lock() {
    this._isLocked = true;
    this._root.querySelectorAll(".tab-header").forEach(headerElm => {
      if (headerElm.getAttribute("data-tab") !== this.selected)
        headerElm.setAttribute("locked", true);
    })
  }

  unlock() {
    this._isLocked = false;
    this._root.querySelectorAll(".tab-header").forEach(headerElm => {
      if (headerElm.hasAttribute("locked"))
        headerElm.removeAttribute("locked");
    })
  }

  constructor() {
    /** @type {HTMLElement | null} */
    this._root = null;
    /** @type {String | null} */
    this._selected = null;
    /** @type {boolean} */
    this._isLocked = false;
    /** @type {ResizeObserver | null} */
    this._observer = null;
  }

  init(root) {
    this._root = root;
    this._root.querySelectorAll(".tab").forEach(tabElm => {
      const headerElm = tabElm.querySelector(".tab-header");
      if (headerElm) {
        headerElm.onclick = () => {
          if (!this._isLocked) {
            const tab = tabElm.getAttribute("data-tab");
            if (tab === this._selected) {
              this.closeTab();
            } else {
              this.openTab(tab);
            }
          }
        }
      }
    });
    this.openTab(this._selected, true);
  }

  /**
   * Setup `ResizeObserver` to handle element's resizing.
   * @param {HTMLElement} tabBodyElm
   */
  _setupObserver(tabElm, tabBodyElm) {
    if (this.observer)
      this.observer.disconnect();

    if (!tabBodyElm || !tabBodyElm.firstElementChild)
      return;

    const contentElm = tabBodyElm.firstElementChild;
    this.observer = new ResizeObserver((e) => {
      if (tabElm.getAttribute("opened") === "true")
        tabBodyElm.style.height = contentElm.scrollHeight + "px";
    });
    this.observer.observe(tabBodyElm.firstElementChild);
  }

  /**
   * Open tab
   * @param {String} tab data-tab attribute
   * @param {boolean} skipAnimation
   */
  openTab(tab, skipAnimation = false) {
    if (tab) {
      const tabElm = this._root.querySelector(`.tab[data-tab="${tab}"]`);
      if (!tabElm)
        return;

      const bodyElm = tabElm.querySelector(".tab-body");
      if (!bodyElm)
        return;

      function show() {
        if (!bodyElm.style.height)
          bodyElm.style.height = `${bodyElm.scrollHeight}px`;
        tabElm.setAttribute("opened", true);
      }

      function showImmediately() {
        bodyElm.style.transition = "none";
        show();
        bodyElm.offsetHeight; // trigger reflow
        bodyElm.style.transition = "";
      }

      if (this._selected && this.selected !== tab)
        this.closeTab();

      if (skipAnimation) {
        showImmediately();
      } else {
        show();
      }

      this._setupObserver(tabElm, bodyElm);
      this._selected = tab;
    }
  }

  /**
   * Close selected tab
   */
  closeTab() {
    if (this._selected) {
      const tabElm = this._root.querySelector(`.tab[data-tab="${this._selected}"]`);
      if (!tabElm)
        return;

      const bodyElm = tabElm.querySelector(".tab-body");
      if (!bodyElm)
        return;

      tabElm.setAttribute("opened", false);
      bodyElm.style.height = "";

      this._selected = null;
    }
  }
}

export default TabsController;
