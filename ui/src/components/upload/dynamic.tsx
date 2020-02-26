// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";

interface P {
    progress: { [index: string]: { [property: string]: number } };
}

const Dynamic: preact.FunctionalComponent<P> = ({ progress }) => {

    let total = 0;
    let loaded = 0;
    for (let path in progress) {
        total = total + progress[path].total;
        loaded = loaded + progress[path].loaded;
    }
    let percentage = 0;
    if (total > 0) {
        percentage = (loaded / total) * 100;
    }

    return (
        <div class={"columns is-multiline is-mobile prusa-border-dashed"} >
            <div class="column is-full">
                <progress class="progress is-success is-medium is-marginless" value={"" + percentage} max="100" />
            </div>
            <div class="column is-full has-text-centered subtitle is-size-3 is-size-6-desktop">
                Uploading...
            </div>
        </div>
    )
}

export default Dynamic;
