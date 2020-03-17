// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";

interface P {
  yes_text: string;
  yes_disabled: boolean;
  no_text: string;
  no_disabled: boolean;
  onNO(e: MouseEvent): void;
  onYES(e: MouseEvent): void;
}

const YesNoView: preact.FunctionalComponent<P> = ({
  yes_text,
  yes_disabled,
  no_text,
  no_disabled,
  onNO,
  onYES
}) => {
  return (
    <div class="prusa-is-flex-end">
      <button
        class="button prusa-button-confirm title is-size-3 is-size-6-desktop"
        onClick={e => onYES(e)}
        disabled={yes_disabled}
      >
        <img
          class="media-left image is-24x24"
          src={require("../../assets/yes_color.svg")}
        />
        {yes_text}
      </button>
      <button
        class="button prusa-button-cancel title is-size-3 is-size-6-desktop"
        onClick={e => onNO(e)}
        disabled={no_disabled}
      >
        <img
          class="media-left image is-24x24"
          src={require("../../assets/cancel.svg")}
        />
        {no_text}
      </button>
    </div>
  );
};

export default YesNoView;
