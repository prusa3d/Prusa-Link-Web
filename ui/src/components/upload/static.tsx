// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import { useTranslation } from "react-i18next";
const icon_download = require("../../assets/download.svg");

interface P {
  active: boolean;
  onclickFile(e: MouseEvent): void;
}

const Static: preact.FunctionalComponent<P> = ({ active, onclickFile }) => {
  const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
  return (
    ready && (
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
        <div class="column is-full has-text-centered txt-normal txt-size-2">
          {t("upld.open", { file: "*.sl1" })}
        </div>
      </div>
    )
  );
};

export default Static;
