// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import { Text } from "preact-i18n";

interface P {
  yes_id: string;
  yes_text: string;
  yes_disabled: boolean;
  no_id: string;
  no_text: string;
  no_disabled: boolean;
  onNO(e: MouseEvent): void;
  onYES(e: MouseEvent): void;
}

const YesNoView: preact.FunctionalComponent<P> = ({
  yes_id,
  yes_text,
  yes_disabled,
  no_id,
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
        <Text id={`questions.${yes_id}`}>{yes_text}</Text>
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
        <Text id={`questions.${no_id}`}>{no_text}</Text>
      </button>
    </div>
  );
};

export default YesNoView;
