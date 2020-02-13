// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import { Text } from 'preact-i18n';
import { ProjectProperties, FileProperties } from "./projectProperties";

import preview from "../../thumbnail800x480.png";

interface P extends FileProperties {
    onBack(): void;
    url: string;
    display: string;
}

const ProjectView: preact.FunctionalComponent<P> = props => {

    const { display, onBack, url, ...properties } = props;

    const onStartPrint = () => {

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "X-Api-Key": process.env.APIKEY,
            },
            body: JSON.stringify({
                "command": "select",
                "print": true
            })
        });
    }

    return (
        <div>
            <p class="title is-size-2 is-size-3-desktop">
                {display}
            </p>
            <div class="columns">
                <div class="column is-two-fifths">
                    <img src={preview} />
                </div>
                <div class="column">
                    <ProjectProperties isVertical={true} {...properties} />
                </div>
            </div>
            <div>
                <button onClick={e => onBack()} class="button is-success is-size-5 is-size-6-desktop">
                    <Text id="project.back">BACK</Text>
                </button>
                <button class="button project-button is-pulled-right is-size-5 is-size-6-desktop" onClick={e => onStartPrint()}>
                    <Text id="project.start_print">START PRINT</Text>
                </button>
            </div>
        </div>
    );
}

export default ProjectView;



