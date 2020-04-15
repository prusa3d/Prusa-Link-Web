// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import "./style.scss";
const image = require("../../assets/dual-ring-1s-200px.svg");

const Loading: preact.FunctionalComponent<{}> = () => {
  return (
    <div class="column is-full prusa-job-question">
      <img class="image is-48x48 prusa-loading" src={image} />
    </div>
  );
};

export default Loading;
