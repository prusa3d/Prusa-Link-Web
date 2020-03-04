// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";

interface P {
  readonly project_name: string;
  readonly progress: number;
}

const StatusProgress: preact.FunctionalComponent<P> = props => {
  return (
    <div>
      <p class="title is-size-2 is-size-5-desktop is-marginless">
        {props.project_name}
      </p>
      <progress
        class="progress is-success is-medium is-marginless"
        value={`${props.progress}`}
        max="100"
      />
      <div class="title has-text-centered is-size-1 is-size-3-desktop">
        {`${props.progress}%`}
      </div>
    </div>
  );
};

export default StatusProgress;
