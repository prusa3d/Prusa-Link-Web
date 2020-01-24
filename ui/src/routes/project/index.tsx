// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment, Component } from "preact";
import { Text } from 'preact-i18n';
import under_construction from "../../assets/under_construction.gif"
import "./style.scss";

interface S {
    parent_path: string;
    current_path: string;
    root_path: string;
}

class Project extends Component<{}, S> {

    container: any = null;
    constructor() {
        super();
        this.state = {
            parent_path: null,
            current_path: null,
            root_path: null
        };
    }

    render() {
        return (
            <Fragment>
                <div class="box has-background-black is-paddingless">
                    <p class="title is-size-2 is-size-5-desktop prusa-text-orange prusa-line">
                        Under construction <span class="subtitle is-size-3 is-size-6-desktop has-text-grey">
                            <Text id="project.subtitle">project files</Text>
                        </span>
                    </p>
                </div>
                <div class="columns">
                    <div class="column is-4 is-offset-4">
                        <img src={under_construction} />
                    </div>
                </div>
            </Fragment>
        );
    }
}



export default Project;
