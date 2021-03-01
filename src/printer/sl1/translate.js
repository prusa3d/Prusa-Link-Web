// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { translate } from "../../locale_provider";

// TODO: consider parsing templates for translation
/* Can't use variables for translate(), language preprocessor needs to know,
    what translations we will use */

export function translateTitles() {
  document.querySelector("#title-status-label").innerHTML =
    translate("home.title") + ": ";
  document.querySelector("#title-hostname-label").innerHTML =
    translate("glob.hostname") + ": ";
  translate("upld.title", { query: ".home-row .component p" });
  translate("temps.title", { query: ".home-row .component:nth-child(2) p" });
}

export const translateTelemetry = () => {
  translate("prop.temp-cpu", { query: `[data-label="prop.temp-cpu"]` });
  translate("prop.temp-led", { query: `[data-label="prop.temp-led"]` });
  translate("prop.temp-amb", { query: `[data-label="prop.temp-amb"]` });
  translate("prop.fan-led", { query: `[data-label="prop.fan-led"]` });
  translate("prop.fan-blower", { query: `[data-label="prop.fan-blower"]` });
  translate("prop.fan-rear", { query: `[data-label="prop.fan-rear"]` });
  translate("prop.cover", { query: `[data-label="prop.cover"]` });
};
