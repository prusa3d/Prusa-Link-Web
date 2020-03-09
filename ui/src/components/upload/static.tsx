// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import { Text } from "preact-i18n";
const icon_download = require("../../assets/download.svg");

interface P {
  active: boolean;
  onclickFile(e: MouseEvent): void;
}

const Static: preact.FunctionalComponent<P> = ({ active, onclickFile }) => {
  return (
    <div
      class={`columns is-multiline is-mobile is-centered prusa-border-dashed ${
        active ? "prusa-active-upload" : ""
      }`}
      onClick={e => onclickFile(e)}
    >
      <div class="column is-offset-5">
        <img
          class={"image is-48x48 project-icon-desktop prusa-img-upload"}
          src={icon_download}
        />
      </div>
      <div class="column is-full has-text-centered prusa-default-text">
        <Text id="upload.message">Choose a *.sl1 or drop it here.</Text>
      </div>
    </div>
  );
};

export default Static;
