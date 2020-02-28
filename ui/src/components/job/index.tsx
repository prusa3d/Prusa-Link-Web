// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from 'preact';
import "./style.scss";
import { JobProgress, ProgressProps } from './progress';
import Cancel from "./cancel";
import Refill from "./refill";
import ExposureTimes from "./exposure-times";

export interface JobProps extends ProgressProps {

}
interface S {
  show: number;
}

export class Job extends Component<JobProps, S> {

  state = { show: 0 };

  shouldComponentUpdate = () => this.state.show == 0;

  onclick = (nextShow: number) => {
    this.setState({ show: nextShow });
  };

  onBack = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ show: 0 }, () => { this.forceUpdate(); });
  }

  render(props, { show }) {
    if (show == 1) {
      return (<ExposureTimes onBack={this.onBack} />);
    }
    else if (show == 2) {
      return (<Refill onBack={this.onBack} />);
    }
    else if (show == 3) {
      return (<Cancel onBack={this.onBack} />);
    }
    else {
      return (<JobProgress {...props} onclick={this.onclick} />);
    }

  }
}
