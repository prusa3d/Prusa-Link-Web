// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { translate } from "../../locale_provider";

// TODO: consider parsing templates for translation
/* Can't use variables for translate(), language preprocessor needs to know,
    what translations we will use */

export function translateTitles() {
  document.querySelector("#title-status-label").innerHTML = translate("home.title") + ": ";
  translate("upld.title", { query: ".home-row .component p" });
  translate("temps.title", { query: ".home-row .component:nth-child(2) p" });
}

export const translateTelemetry = () => {
    translate("prop.temp-nozzle", { query: `[data-label="prop.temp-nozzle"]`});
    translate("prop.temp-bed", { query: `[data-label="prop.temp-bed"]`});
    translate("prop.speed", { query: `[data-label="prop.speed"]`});
    translate("prop.z-height", { query: `[data-label="prop.z-height"]`});
    translate("prop.material", { query: `[data-label="prop.material"]`});
  }