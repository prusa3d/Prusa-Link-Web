// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, createRef } from "preact";
import { useEffect } from 'preact/hooks';
import { Text } from 'preact-i18n';

import { ProjectProperties, FileProperties } from "./projectProperties";
import preview from "../../assets/thumbnail.png";

interface P extends FileProperties {
    onBack(e: Event): void;
    url: string;
    display: string;
    preview_src: string;
}

const ProjectView: preact.FunctionalComponent<P> = props => {

    const { display, onBack, url, preview_src, ...properties } = props;
    const ref = createRef();

    useEffect(() => {
        const options = {
            headers: {
                "X-Api-Key": process.env.APIKEY,
                "Content-Type": "image/png"
            }
        };

        fetch(preview_src, options)
            .then(function (response) {
                if (!response.ok) {
                    throw Error(response.statusText);
                }
                return response;
            })
            .then(res => res.blob())
            .then(blob => {
                ref.current.src = URL.createObjectURL(blob);
            }).catch(e => {
                ref.current.src = preview;
            });
    }, [props.preview_src]);


    const onStartPrint = (e: Event) => {

        e.preventDefault();

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
                    <img ref={ref} />
                </div>
                <div class="column">
                    <ProjectProperties isVertical={true} {...properties} />
                </div>
            </div>
            <div>
                <button onClick={e => onBack(e)} class="button is-success is-size-5 is-size-6-desktop">
                    <Text id="project.back">BACK</Text>
                </button>
                <button class="button project-button is-pulled-right is-size-5 is-size-6-desktop" onClick={e => onStartPrint(e)}>
                    <Text id="project.start_print">START PRINT</Text>
                </button>
            </div>
        </div>
    );
}


export default ProjectView;



