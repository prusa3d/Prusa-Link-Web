// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";

import { network } from "../utils/network";
import View from "./projectView";
import { ProjectProps } from "./projectView";
import ExposureTimes from "../progress/sla/exposure-times";
import { Delete, DeleteProps } from "./delete";
import "./style.scss";

interface P extends ProjectProps, network, DeleteProps {}

interface S {
  show: number;
}

class ProjectView extends Component<P, S> {
  state = { show: 0 };

  onclick = (e: Event, nextShow: number) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ show: nextShow });
  };

  onBack = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ show: 0 }, () => {
      this.forceUpdate();
    });
  };

  render(props, { show }) {
    switch (show) {
      case 1:
        return <ExposureTimes onBack={this.onBack} onFetch={props.onFetch} />;
      case 2:
        return (
          <Delete
            url={props.url}
            display={props.display}
            onFetch={props.onFetch}
            onCancel={this.onBack}
            onConfirm={props.onBack}
          />
        );
      default:
        return <View {...props} onclick={this.onclick} />;
    }
  }
}

export default ProjectView;
