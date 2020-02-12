// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from 'preact';
import { Text } from 'preact-i18n';

interface P {
    show: boolean;
    close(): void;
}

const Welcome: preact.FunctionalComponent<P> = props => {
    return (
        <div class={props.show ? "modal is-active" : "modal"}>
            <div class="modal-background"></div>
            <div class="modal-content">
                <div class="box has-background-grey-dark">
                    <button class="delete is-pulled-right" onClick={e => props.close()}></button>
                    <p class="subtitle is-size-3 is-size-6-desktop">
                        <Text id="notification.welcome-part1">Welcome to the web interface of your</Text><span class=" prusa-text-orange"> {process.env.PRINTER}</span>.
                        <br />
                        <Text id="notification.welcome-part2">Please note that values are shown only when the printer is printing.</Text>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Welcome;