// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from 'preact';

interface P {
    show: boolean;
    close(): void;
}

const Welcome: preact.FunctionalComponent<P> = props => {
    return (
        <Fragment>
            {
                props.show &&
                <div class="box has-background-grey-dark">
                    <button class="delete is-pulled-right" onClick={e => props.close()}></button>
                    <p class="subtitle is-size-3 is-size-6-desktop">
                        Welcome to the web interface of your {process.env.PRINTER}.
                        <br />
                        Please note that values are shown only when the printer is printing.
                    </p>
                </div>
            }
        </Fragment>
    );
};

export default Welcome;