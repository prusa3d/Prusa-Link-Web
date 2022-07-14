// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later
import { translate } from "../../locale_provider";
import { getImage } from "../../auth.js";
import { handleError } from "./errors";

let timestamp = null;

const load = (context) => {
  translate("camera.link", { query: "#title-status-label" });
  updateImage(getCurrentTimestamp());
};

const update = (context) => {
  const now = getCurrentTimestamp();
  if (now - timestamp > process.env.WITH_CAMERA_UPDATE_INTERVAL) {
    updateImage(now);
  }
}

const updateImage = (currentTimestamp) => {
  timestamp = currentTimestamp;
  getImage(
    "/api/camera",
    timestamp,
    {
      method: "POST",
      headers: { "Content-Type": "text/json" },
      body: JSON.stringify({
        resolution: {
          width: process.env['WITH_CAMERA_RESX'],
          height: process.env['WITH_CAMERA_RESY'],
        }
      })
    }
  ).then(
    url => {
      const img = document.getElementById("camera-image");
      img.src = url;
    }
  ).catch(
    async response => handleError({
      data: JSON.parse(await response.text())
    })
  );
}

const getCurrentTimestamp = () => Math.round(Date.now() / 1000);

export default { load, update };
