// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import { TempProps, Temperature } from "../../components/temperature";

const Temperatures: preact.FunctionalComponent<TempProps> = props => {
    return (
        <Fragment>
            <div class="box has-background-black is-paddingless">
                <p class="title is-size-2 is-size-5-desktop prusa-text-orange prusa-line">
                    {process.env.PRINTER} <span class="subtitle is-size-3 is-size-6-desktop has-text-grey">printer temperatures</span>
                </p>
            </div>

            <div class="columns">
                <div class="is-8 is-offset-2">
                    <Temperature temperatures={props.temperatures} bigSize={true} />
                </div>
            </div>
        </Fragment>
    );
}



export default Temperatures;
