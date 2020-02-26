// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from 'preact';
import { Text } from 'preact-i18n';

interface P {
}

const Cancel: preact.FunctionalComponent<P> = props => {
  return (
    <div class="columns is-multiline is-mobile is-centered is-vcentered">
      <div class="column is-half">
        <p class="prusa-line">Cancel Print</p>
      </div>
      <div class="column is-full has-text-centered">
        Do you really want to cancel print?
      </div>
    </div>
  );
}

export default Cancel;