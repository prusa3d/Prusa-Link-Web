// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from 'preact';
import { Text } from 'preact-i18n';

interface P {
}

const ExposureTimes: preact.FunctionalComponent<P> = props => {
  return (
    <div class="columns is-multiline is-mobile">
      <div class="column is-full">
        Change exposure times
      </div>
      <div class="column is-full">
        <p>exposure time</p>
        <p>first layer</p>
      </div>
    </div>
  );
}

export default ExposureTimes;