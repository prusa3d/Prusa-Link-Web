// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment, Component } from "preact";
import Title from "../../components/title"
import TreeNode from "../../components/treenode";
import { Job, JobProps } from "../../components/job";



class Project extends Component<JobProps, {}> {
    render(props, { }) {

        let view;
        if (props.progress_bar.project_name == "") {
            view = (
                <Fragment>
                    <Title id="project.title" default_text="Project files" />
                    <TreeNode />
                </Fragment>
            );
        } else {
            view = (<Job {...this.props} />);
        }
        return (view);
    }
}

export default Project;
