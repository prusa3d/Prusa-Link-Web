// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from 'preact';

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
                        Welcome to the web interface of your <span class=" prusa-text-orange">{process.env.PRINTER}</span>.
                        <br />
                        Please note that values are shown only when the printer is printing.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Welcome;