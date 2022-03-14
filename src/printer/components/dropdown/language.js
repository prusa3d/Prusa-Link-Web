// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { Dropdown } from "./index";
import { getLanguage, getLanguages, setLanguage } from "../../../locale_provider";

/**
   * @param {(HTMLElement|string|undefined)} root Root element - from that element
   * the search for input element begins. Pass HTMLElement (ref), string (id) or
   * undefined (body).
   * @param {(string | undefined)} id Optional element ID
*/
const init = (root, id) => {
  const dropdown = Dropdown.init(root, id);
  if (dropdown) {
    dropdown.setOptions(getLanguages());
    dropdown.value = getLanguage();
    dropdown.onselect = (lang) => {
      setLanguage(lang);
      window.location.reload();
    };
  };
};

export default { init };