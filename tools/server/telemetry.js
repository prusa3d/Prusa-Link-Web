// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const telemetry = (app, printer) => {
  let temperature = {
    tool0: {
      actual: 214.8821,
      target: 220.0,
      offset: 0,
    },
    bed: {
      actual: 50.221,
      target: 70.0,
      offset: 5,
    },
    chambe: {
      actual: 25.3,
      target: null,
      offset: 0,
    },
  };

  const sd = { ready: true };

  const state = {
    text: "Operational",
    flags: {
      operational: true,
      paused: false,
      printing: false,
      cancelling: false,
      pausing: false,
      sdReady: true,
      error: false,
      ready: true,
      closedOrError: false,
    },
  };

  app.get("/api/printer", function (req, res) {
    res.json({
      temperature: temperature,
      sd: sd,
      state: state,
    });
  });
};

module.exports = telemetry;
