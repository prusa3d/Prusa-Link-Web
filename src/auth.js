// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { modal } from "./modal.js";

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

const getHeaders = () => {
  let authType = sessionStorage.getItem("authType");
  if (authType == "ApiKey") {
    let apiKey = sessionStorage.getItem("apiKey");
    if (apiKey) {
      return { headers: { "X-Api-Key": apiKey } };
    }
    throw Error("Missing ApiKey");
  }
  return {};
};

const validate_auth = (response) => {
  if (response.status == 401) {
    const auth_type = response.headers.get("WWW-Authenticate").split(" ")[0];
    sessionStorage.setItem("auth", false);
    sessionStorage.setItem("authType", auth_type);
    sessionStorage.removeItem("apiKey");
    throw Error(auth_type);
  }
};

const setUpAuth = async () => {
  try {
    const options = getHeaders();
    await fetch("/api/version", options)
      .then((response) => {
        validate_auth(response);
        return response.json();
      })
      .then((data) => {
        sessionStorage.setItem("auth", true);
      })
      .catch((e) => {
        // change page error
        console.log("change page error");
        if (e.message == "ApiKey") {
          askApiKey(setUpAuth);
        } else {
          setTimeout(() => setUpAuth(), 1000);
        }
      });
  } catch (err) {
    askApiKey(setUpAuth);
  }
};

export { getHeaders, validate_auth, setUpAuth };
