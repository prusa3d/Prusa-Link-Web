// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Upload content using XMLHttpRequest
 * @param {string} url
 * @param {FormData} data file(s) packed in FormData
 * @param {{onProgress(progress): void}} opt options
 */

 import { getHeaders } from "../auth";

 function uploadRequest(url, data, opt) {
  return new Promise((resolve, reject) => {
    var request = new XMLHttpRequest();

    const completeHandler = (event) => {
      const response = toResponse(event.target);
      if (response.ok) {
        resolve(response);
      } else {
        reject(response);
      }
    }

    const errorHandler = () => {
      reject(undefined);
    }

    initProgressHandler(request, opt.onProgress);
    request.addEventListener("load", completeHandler, false);
    request.addEventListener("error", errorHandler, false);
    request.addEventListener("abort", errorHandler, false);

    request.open("POST", url);
    for (const [key, value] of Object.entries(getHeaders())) {
      request.setRequestHeader(key, value);
    }
    request.send(data);
  });
}

function initProgressHandler(request, callback) {
  if (callback) {
    const progressHandler = (event) => {
      if (!event.lengthComputable) {
        return;
      }
      let percentage = Math.round((event.loaded / event.total) * 100);
      callback({
        loaded: event.loaded,
        total: event.total,
        percentage,
      });
    }
    request.upload.addEventListener("progress", progressHandler, false);
  }
}

/** Convert XMLHttpRequest event.target to response object */
function toResponse(target) {
  function toJson(response) {
    try {
      return JSON.parse(response);
    } catch {
      return undefined;
    };
  }

  return {
    status: target.status,
    statusText: target.statusText,
    ok: (target.status >= 200 && target.status <= 299),
    data: toJson(target.response),
  };
}

export default uploadRequest;
