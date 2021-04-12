// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { modal } from "./printer/components/modal";
import { handleError } from "./printer/components/errors";
import { translate } from "./locale_provider";

const createApiKey = (resolve) => {
  return (close) => {
    const template = document.getElementById(`modal-apiKey`);
    const node = document.importNode(template.content, true);

    const loginInput = node.getElementById("apiKey");
    loginInput.addEventListener("keydown", (event) => {
      if (event.key == "Enter") {
        close();
        resolve(event.target.value);
      }
    });

    const loginButton = node.getElementById("login");
    loginButton.addEventListener("click", (event) => {
      event.preventDefault();
      let apiKey = document.getElementById("apiKey").value;
      close();
      resolve(apiKey);
    });

    node.getElementById("msg1").innerHTML = translate("msg.api-key-1");
    node.getElementById("msg2").innerHTML = translate("msg.api-key-2");
    node.getElementById("msg3").innerHTML = translate("msg.api-key-3");
    return node;
  };
};

/**
 * Show modal and ask the api key
 * @param {function} cb
 */
export const askApiKey = () =>
  new Promise((resolve, reject) => {
    modal(createApiKey(resolve), {
      timeout: 0,
      closeOutside: false,
    });
  }).then((apiKey) => sessionStorage.setItem("apiKey", apiKey));

/**
 * Create the readers with apiKey if exist and Accept keys
 */
const getHeaders = () => {
  if (sessionStorage.getItem("authType") == "ApiKey") {
    return {
      "X-Api-Key": sessionStorage.getItem("apiKey"),
      Accept: "application/json",
    };
  }
  return { Accept: "application/json" };
};

/**
 * Authenticate the browser
 */
const setUpAuth = () =>
  new Promise((resolve, reject) => {
    sessionStorage.setItem("auth", "pending");
    return fetch("/api/version", { headers: getHeaders() })
      .then((response) => {
        if (response.status == 401) {
          response.json().then((data) => handleError({ data }));
          const auth_type = response.headers
            .get("WWW-Authenticate")
            .split(" ")[0];
          sessionStorage.setItem("authType", auth_type);
          sessionStorage.removeItem("apiKey");
          if (auth_type == "ApiKey") {
            return askApiKey().then(() =>
              setUpAuth().then((data) => resolve(data))
            ); // ApiKey
          }
          return setUpAuth().then((data) => resolve(data)); // http-digest
        } else {
          return response.json(); // done
        }
      })
      .then((data) => {
        sessionStorage.setItem("auth", "true");
        resolve(data);
      });
  });

/**
 * Async function for fetch url then call the callback with the data
 * @param {string} url
 * @param {object} opts
 */
const getJson = (url, opts = {}) =>
  new Promise((resolve, reject) => {
    const auth = sessionStorage.getItem("auth");
    if (auth == "true") {
      opts.headers = { ...opts.headers, ...getHeaders() };
      fetch(url, opts).then((response) => {
        const status = response.status;
        const result = {
          code: status,
          eTag: response.headers.get("etag"),
        };
        if (status == 401) {
          sessionStorage.setItem("auth", "false");
          reject(result);
        } else if (status == 204 || status == 304) {
          resolve(result);
        } else {
          response.json().then((data) => {
            result["data"] = data;
            if (response.ok) {
              resolve(result);
            } else {
              reject(result);
            }
          });
        }
      });
    } else {
      reject({ code: 401 });
    }
  });

/**
 * Async function for fetch image
 * @param {string} url
 * @param {object} opts
 */
const getImage = (url) =>
  new Promise((resolve, reject) => {
    const auth = sessionStorage.getItem("auth");
    if (auth == "true") {
      const opts = {
        headers: { "Content-Type": "image/png", ...getHeaders() },
      };
      fetch(url, opts).then((response) => {
        if (response.status == 401) {
          sessionStorage.setItem("auth", "false");
          reject();
        }
        response.blob().then((blob) => resolve(URL.createObjectURL(blob)));
      });
    } else {
      reject();
    }
  });

const createWelcome = (close) => {
  const template = document.getElementById(`modal-welcome`);
  const node = document.importNode(template.content, true);
  const closeButton = node.querySelector(".close-button");
  closeButton.addEventListener("click", close);
  node.getElementById("msg1").innerHTML = translate("msg.modal-p1");
  node.getElementById("msg2").innerHTML = translate("msg.modal-p2");
  return node;
};

const initAuth = () => {
  const showWelcome = localStorage.getItem("showWelcome");
  if (showWelcome == null) {
    return new Promise((resolve, reject) => {
      modal(createWelcome, {
        closeCallback: () => {
          localStorage.setItem("showWelcome", true);
          resolve();
        },
      });
    }).then(() => setUpAuth());
  } else {
    return setUpAuth();
  }
};

export { getJson, initAuth, getImage };
