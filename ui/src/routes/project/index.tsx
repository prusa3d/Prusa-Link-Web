// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment, Component } from "preact";
import Title from "../../components/title"
import TreeNode from "../../components/treenode";


class Project extends Component<{}, {}> {

    render() {
        return (
            <Fragment>
                <Title id="project.subtitle" default_text="project files" />
                <TreeNode />
            </Fragment>
        );
    }
}



export default Project;
