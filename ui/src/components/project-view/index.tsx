// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";
import View from "./projectView";
import { ProjectProps } from "./projectView";
import ExposureTimes from "../progress/sla/exposure-times";
import "./style.scss";

interface P extends ProjectProps {}

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
        return <ExposureTimes onBack={this.onBack} />;
      default:
        return <View {...props} onclick={this.onclick} />;
    }
  }
}

export default ProjectView;
