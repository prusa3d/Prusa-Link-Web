// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import { TempProps, Temperature } from "../../components/temperature";
import Title from "../../components/title"

const Temperatures: preact.FunctionalComponent<TempProps> = props => {
    return (
        <Fragment>
            <Title title="Printer temperatures"/>
            <div class="columns is-centered">
                <div class="column is-full">
                    <Temperature temperatures={props.temperatures} bigSize={true} />
                </div>
            </div>
        </Fragment>
    );
}



export default Temperatures;
