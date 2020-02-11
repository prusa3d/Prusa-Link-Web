// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment, Component } from "preact";
import under_construction from "../../assets/under_construction.gif"
import Title from "../../components/title"
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
                <Title title="Project files">
                    <span class="title is-size-5 is-size-6-desktop prusa-text-orange"> Under construction</span>
                </Title>
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
