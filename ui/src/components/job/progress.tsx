// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import { useTranslation } from "react-i18next";
import Title from "../title";
import StatusBoard from "../../components/status-board";
import { PrinterState } from "../telemetry";

interface P {
  printer_state: PrinterState;
  onclick(nextShow: number): void;
}

const JobProgress: preact.FunctionalComponent<P> = props => {
  const onclick = (e: Event, nextShow: number) => {
    e.preventDefault();
    e.stopPropagation();
    props.onclick(nextShow);
  };

  const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
  return (
    ready && (
      <Fragment>
        <Title title={t("proj.title")} />
        <div class="columns is-multiline is-mobile">
          <StatusBoard printer_state={props.printer_state} isJob />
          <div class="column is-full">
            <div class="prusa-is-flex-end">
              <button
                class="button prusa-button-grey title is-size-3 is-size-6-desktop"
                onClick={e => onclick(e, 1)}
              >
                <img
                  class="media-left image is-24x24"
                  src={require("../../assets/exposure_times_color.svg")}
                />
                {t("btn.chg-exp")}
              </button>
              <button
                class="button prusa-button-grey title is-size-3 is-size-6-desktop"
                onClick={e => onclick(e, 2)}
              >
                <img
                  class="media-left image is-24x24"
                  src={require("../../assets/refill_color.svg")}
                />
                {t("btn.sla-refill")}
              </button>
              <button
                class="button prusa-button-confirm title is-size-3 is-size-6-desktop"
                onClick={e => onclick(e, 3)}
              >
                <img
                  class="media-left image is-24x24"
                  src={require("../../assets/cancel.svg")}
                />
                {t("btn.cancel-pt")}
              </button>
            </div>
          </div>
        </div>
      </Fragment>
    )
  );
};

export default JobProgress;
