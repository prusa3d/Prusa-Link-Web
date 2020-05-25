// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import { useTranslation } from "react-i18next";

interface P {
  progress: { [index: string]: number };
}

const Dynamic: preact.FunctionalComponent<P> = ({ progress }) => {
  let total = 0;
  let n = Object.keys(progress).length;
  for (let path in progress) {
    total = total + progress[path];
  }

  const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
  return (
    <div class={"columns is-multiline is-mobile prusa-border-dashed"}>
      <div class="column is-full">
        <progress
          class="progress is-success is-medium is-marginless"
          value={"" + (total / n) * 100}
          max="100"
        />
      </div>
      <div class="column is-full has-text-centered txt-normal txt-size-2">
        {t("upld.loading")}
      </div>
    </div>
  );
};

export default Dynamic;
