// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const printer = (() => {
    if (process.env.TYPE == "Mini") return require("./mini");
    if (process.env.TYPE == "SL1") return require("./sl1");
    if (process.env.TYPE == "MK3") return require("./mk3");   
})().default;

export default printer;