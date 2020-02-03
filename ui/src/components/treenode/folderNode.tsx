// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";

interface Props {
    display: string;
    path: string;
    onSelectFolder(path:string): void;
}

const FolderNode: preact.FunctionalComponent<Props> = props => {

    return (
        <div class="column is-full tree-node-item" onClick={() => props.onSelectFolder(props.path)}>
            <div class="media">
                <figure class="media-left image is-48x48 project-icon-desktop">
                    <img src={require("../../assets/projects_small.svg")} />
                </figure>
                <div class="media-content">
                    <p class="title is-size-3 is-size-5-desktop">
                        {props.display}
                    </p>
                </div>
            </div>
        </div>
    );
}


export default FolderNode;


