// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

module.exports = {
  files: [
    {
      name: "system.log",
      date: 1621844652,
      size: 256,
      refs: {
        download: "http://localhost:9000/api/logs?filename=system.log"
      }
    },
    {
      name: "files.log",
      date: 1621844642,
      size: 512,
      refs: {
        download: "http://localhost:9000/api/logs?filename=files.log"
      }
    },
    {
      name: "print.log",
      date: 1621844632,
      size: 256,
      refs: {
        download: "http://localhost:9000/api/logs?filename=print.log"
      }
    },
    {
      name: "errors.log",
      date: 1621844622,
      size: 128,
      refs: {
        download: "http://localhost:9000/api/logs?filename=errors.log"
      }
    },
    {
      name: "empty.log",
      date: 1621844722,
      size: 0,
      refs: {
        download: "http://localhost:9000/api/logs?filename=empty.log"
      }
    },
    {
      name: "large.log",
      date: 1621844952,
      size: 150000000,
      refs: {
        download: "http://localhost:9000/api/logs?filename=large.log"
      }
    },
  ]
};
