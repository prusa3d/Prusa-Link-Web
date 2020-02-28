// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from 'preact';
import { Text } from 'preact-i18n';


interface P {
    yes_id: string;
    yes_text: string;
    no_id: string;
    no_text: string;
    onNO(e: MouseEvent): void;
    onYES(e: MouseEvent): void;
}

const YesNoView: preact.FunctionalComponent<P> = ({ yes_id, yes_text, no_id, no_text, onNO, onYES }) => {
    return (
        <Fragment>
            <button class="button prusa-job-right-button" onClick={e => onNO(e)}>
                <img class="media-left image is-24x24" src={require("../../assets/cancel.svg")} />
                <p class="title is-size-5 is-size-6-desktop">
                    <Text id={`questions.${no_id}`}>{no_text}</Text>
                </p>
            </button>
            <button class="button prusa-job-left-button" onClick={e => onYES(e)}>
                <img class="media-left image is-24x24" src={require("../../assets/yes_color.svg")} />
                <p class="title is-size-5 is-size-6-desktop">
                    <Text id={`questions.${yes_id}`}>{yes_text}</Text>
                </p>
            </button>
        </Fragment>
    );
}

export default YesNoView;