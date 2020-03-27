// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";

interface P {
  title: string;
  children?: any;
}

const Title: preact.FunctionalComponent<P> = ({ title, children }) => {
  return (
    <div class="box has-background-black is-paddingless prusa-line">
      <div class="columns is-centered">
        <div class="column prusa-title">
          {title}
          {children && children}
        </div>
        <div class="column has-text-right prusa-title prusa-text-orange">
          {process.env.PRINTER}
        </div>
      </div>
    </div>
  );
};

export default Title;
