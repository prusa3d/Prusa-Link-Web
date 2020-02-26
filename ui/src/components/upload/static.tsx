// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
const icon_download = require("../../assets/download.svg")

interface P {
    active: boolean;
    onclickFile(e: MouseEvent): void
}

const Static: preact.FunctionalComponent<P> = ({ active, onclickFile }) => {

    return (
        <div
            class={`columns is-multiline is-mobile is-centered prusa-border-dashed ${active ? "prusa-active-upload" : ""}`}
            onClick={e => onclickFile(e)}
        >
            <div class="column is-offset-5">
                <img class={"image is-48x48 project-icon-desktop prusa-img-upload"} src={icon_download} />
            </div>
            <div class="column is-full has-text-centered subtitle is-size-3 is-size-6-desktop">
                Choose a *.sl1 or drop it here.
            </div>
        </div>
    )

}

export default Static;
