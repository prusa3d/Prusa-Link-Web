// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import { Text } from 'preact-i18n';
import "./style.scss";

interface P {
    id: string;
    default_text: string;
}

const Title: preact.FunctionalComponent<P> = ({ id, default_text }) => {

    return (
        <div class="box has-background-black is-paddingless">
            <p class="title is-size-2 is-size-5-desktop prusa-text-orange prusa-line">
                {process.env.PRINTER} <span class="subtitle is-size-3 is-size-6-desktop has-text-grey">
                    <Text id={id}>{default_text}</Text>
                </span>
            </p>
        </div>
    );
}


export default Title;


