// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";

interface P {
  title: string;
  value: string | number;
}

const StatusBoardItem: preact.FunctionalComponent<P> = ({ title, value }) => {
  return (
    <div class="column is-one-third">
      <p class="txt-normal txt-size-2 txt-grey">{title}</p>
      <p class="txt-bold txt-size-2">{value}</p>
    </div>
  );
};

export default StatusBoardItem;
