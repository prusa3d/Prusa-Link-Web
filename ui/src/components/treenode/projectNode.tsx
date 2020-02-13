// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import { Text } from 'preact-i18n';

import { ProjectProperties, FileProperties } from "./projectProperties";
import preview from "../../thumbnail800x480.png";

interface Props extends FileProperties {
    display: string;
    onSelectFile(): void;
}

const ProjectNode: preact.FunctionalComponent<Props> = props => {

    const { display, onSelectFile, ...properties } = props;

    return (
        <div class="column is-full tree-node-item" onClick={() => onSelectFile()}>
            <div class="media">
                <img class="media-left project-preview" src={preview} />
                <div class="media-content">
                    <div class="columns is-multiline is-mobile is-gapless">
                        <div class="column is-full">
                            <p class="title is-size-3 is-size-4-desktop">
                                {display}
                            </p>
                        </div>
                        <div class="column is-full">
                            <ProjectProperties isVertical={false} {...properties} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


export default ProjectNode;


