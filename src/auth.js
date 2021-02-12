// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { modal } from "./modal.js";

/**
 * Show modal and ask the api key
 * @param {function} cb
 */
const askApiKey = (cb) => {
  modal("apiKey", {
    timeout: 0,
    closeOutside: false,
    events: {
      click: {
        login: (event, close) => {
          event.preventDefault();
          let apiKey = document
            .querySelector(".modal-box")
            .querySelector("#apiKey").value;
          sessionStorage.setItem("apiKey", apiKey);
          close();
          cb();
        },
      },
      keydown: {
        apiKey: (event, close) => {
          if (event.key == "Enter") {
            sessionStorage.setItem("apiKey", event.target.value);
            close();
            cb();
          }
        },
      },
    },
  });
};

/**
 * Create the readers with apiKey if exist and Accept keys
 */
const getHeaders = () => {
  let authType = sessionStorage.getItem("authType");
  if (authType == "ApiKey") {
    let apiKey = sessionStorage.getItem("apiKey");
    if (apiKey) {
      return { "X-Api-Key": apiKey, Accept: "application/json" };
    }
    throw Error("Missing ApiKey");
  }
  return {};
};

/**
 * Check if the browser is authenticated
 * @param {Response} response
 */
const validate_auth = (response) => {
  if (response.status == 401) {
    const auth_type = response.headers.get("WWW-Authenticate").split(" ")[0];
    sessionStorage.setItem("auth", "false");
    sessionStorage.setItem("authType", auth_type);
    sessionStorage.removeItem("apiKey");
    throw Error(auth_type);
  }
};

/**
 * Authenticate the browser
 */
const setUpAuth = async () => {
  try {
    sessionStorage.setItem("auth", "pending");
    return await fetch("/api/version", { headers: getHeaders() })
      .then((response) => {
        validate_auth(response);
        return response.json();
      })
      .then((data) => {
        sessionStorage.setItem("auth", "true");
        return data;
      })
      .catch((e) => {
        // change page error
        console.log("change page error");
        if (e.message == "ApiKey") {
          askApiKey(setUpAuth);
        } else {
          setUpAuth();
        }
      });
  } catch (err) {
    askApiKey(setUpAuth);
  }
};

/**
 * Response status
 * @typedef Status
 * @property {number} code
 * @property {boolean} ok
 */

/**
 * Async function for fetch url then call the callback with the data
 * @param {string} url
 * @param {(status: Status, data) => void} cb
 * @param {headers} opts
 */
const getJson = async (url, cb, opts = {}) => {
  let auth = sessionStorage.getItem("auth");
  if (auth == "true") {
    try {
      opts.headers = { ...opts.headers, ...getHeaders() };
      await fetch(url, opts)
        .then((response) => {
          validate_auth(response);
          const res = {
            code: response.status,
            ok: response.ok,
            eTag: response.headers.get("etag"),
          };
          if (response.status == 204 || response.status == 304) {
            cb(res, null);
          } else {
            return response.json().then((data) => cb(res, data));
          }
        })
        .catch((e) => {
          throw e;
        });
    } catch (err) {
      // TODO ERROR HANDLING
      console.log(err);
    }
  } else if (auth == "false") {
    const showedWelcome = localStorage.getItem("showWelcome");
    if (showedWelcome) {
      setUpAuth();
    }
  }
};

const initAuth = () => {
  const showWelcome = localStorage.getItem("showWelcome");
  if (showWelcome == null) {
    modal("welcome", {
      closeCallback: () => {
        localStorage.setItem("showWelcome", true);
        return setUpAuth();
      },
    });
  } else {
    return setUpAuth();
  }
};

export { getHeaders, validate_auth, setUpAuth, getJson, initAuth };
