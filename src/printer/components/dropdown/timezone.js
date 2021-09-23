// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { Dropdown } from "./index";

/**
   * @param {(HTMLElement|string|undefined)} root Root element - from that element
   * the search for input element begins. Pass HTMLElement (ref), string (id) or
   * undefined (body).
*/
const init = (root) => {
  const dropdown = Dropdown.init(root);
  if (dropdown) {
    dropdown.setOptions(["Prague(GMT+1)", "TimeZone 2", "TimeZone 3"]);
    dropdown.value = "Prague(GMT+1)";
    dropdown.onselect = (timezone) => {
      console.log(`select: ${timezone}`)
    };
  };
};

export default { init };