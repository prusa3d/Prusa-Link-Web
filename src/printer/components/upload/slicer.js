// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { getJson } from "../../../auth";
import { handleError } from "../errors";
import { translate } from "../../../locale_provider";

let ip = window.location.hostname;
let apiKey = null;

async function init() {
  if (!apiKey)
    apiKey = await getApiKey();

  updateGuide(ip, apiKey);
}

async function getApiKey() {
  try {
    const result = await getJson("api/settings");
    return result.data["api-key"];
  } catch (result) {
    handleError(result);
    return null;
  }
}

function updateGuide(ip, apiKey) {
  const guide = document.getElementById("upld-slicer-guide-2");
  if (guide) {
    // TODO: Observe better way how to style arguments
    guide.innerHTML = translate("upld.slicer.guide.2", {
      ip_address: ip ? `<span class="txt-bold">${ip}</span>` : "",
      api_key: apiKey ? `<span class="txt-bold">${apiKey}</span>` : "",
    });
  }
}

export default { init };
