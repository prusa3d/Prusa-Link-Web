// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import temperature from "./temperature";

const load = () => {
  console.log("Dashboard Logic - sl1");
  temperature.load();
};

export default { load };