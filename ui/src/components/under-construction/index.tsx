// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
const UnderConstruction = props => {
    if (process.env.PRINTER != "Original Prusa Mini") {
        return require('./component').default(props);
    } else {
        return (<div />)
    }
}

export default UnderConstruction;


