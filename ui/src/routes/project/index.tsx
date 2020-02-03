// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment, Component } from "preact";
import { Text } from 'preact-i18n';
import TreeNode from "../../components/treenode";


class Project extends Component<{}, {}> {

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
                <TreeNode />
            </Fragment>
        );
    }
}



export default Project;
