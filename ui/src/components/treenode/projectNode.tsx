// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import preview from "../../thumbnail800x480.png";

interface Props {
    display: string;
    printing_time: number;
    material: string;
    leyer_height: number;
    path: string;
    onSelectFile(path: string): void;
}

const ProjectNode: preact.FunctionalComponent<Props> = props => {

    return (
        <div class="column is-full tree-node-item" onClick={() => props.onSelectFile(props.path)}>
            <div class="media">
                <img class="media-left project-preview" src={preview} />
                <div class="media-content">
                    <div class="columns is-multiline is-mobile is-gapless">
                        <div class="column is-full">
                            <p class="title is-size-3 is-size-4-desktop">
                                {props.display}
                            </p>
                        </div>
                        <div class="column is-full">
                            <div class="columns">
                                <div class="column has-text-grey">
                                    <img src={require("../../assets/time_color.svg")} width="15" /> printing time <span class="has-text-white has-text-weight-bold">{props.printing_time}</span>
                                </div>
                                <div class="column has-text-grey">
                                    <img src={require("../../assets/status_filament.svg")} width="15" /> material <span class="has-text-white has-text-weight-bold">{props.material}</span>
                                </div>
                                <div class="column has-text-grey">
                                    <img src={require("../../assets/quality_medium.svg")} width="15" /> leyer height <span class="has-text-white has-text-weight-bold">{props.leyer_height}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="media-right project-button-container">
                    <button class="button project-button">PRINT</button>
                </div>
            </div>
        </div>
    );
}


export default ProjectNode;


