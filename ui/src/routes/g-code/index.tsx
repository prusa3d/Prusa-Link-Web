// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from 'preact';
import Title from "../../components/title"

interface P {

}

const GCode: preact.FunctionalComponent<P> = props => {
  return (
    <Fragment>
      <Title default_text="G-code" />
      <div class="field has-addons">
        <div class="control">
          <input class="input" type="text" />
        </div>
        <div class="control">
          <a class="button is-info">
            Send
          </a>
        </div>
      </div>
    </Fragment>
  );
};

export default GCode;
