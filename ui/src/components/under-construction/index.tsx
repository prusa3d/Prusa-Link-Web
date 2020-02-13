// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import Title from "../../components/title"
import under_construction from "../../assets/under_construction.gif"

interface P {
}

const UnderConstruction: preact.FunctionalComponent<P> = props => {
    return (
        <Fragment>
            <Title id="under-construction" default_text="Under construction" />
            <div class="columns">
                <div class="column is-4 is-offset-4">
                    <img src={under_construction} />
                </div>
            </div>
        </Fragment>
    );
}


export default UnderConstruction;


