// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import { useTranslation } from "react-i18next";
import { PrinterState } from "../telemetry";
import Title from "../title";
import YesNoView from "./yes-no";
import { canCancelPrinting } from "../utils/states";

interface P {
  printer_state: PrinterState;
  onBack(e: MouseEvent): void;
}

const Cancel: preact.FunctionalComponent<P> = ({ printer_state, onBack }) => {
  const onYes = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fetch("/api/job", {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.APIKEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        command: "cancel"
      })
    }).then(function(response) {
      if (response.ok) {
        onBack(e);
      }
      return response;
    });
  };

  const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
  const cancel_label = t("btn.cancel");
  return (
    ready && (
      <Fragment>
        <Title title={cancel_label} />
        <div class="columns is-multiline is-mobile is-centered is-vcentered">
          <div class="column is-full">
            <p class="prusa-default-text has-text-centered prusa-job-question">
              {t("msg.cancel")}
            </p>
          </div>
          <div class="column is-full">
            <YesNoView
              no_text={t("btn.no")}
              onNO={onBack}
              yes_text={t("btn.yes")}
              onYES={onYes}
              yes_disabled={!canCancelPrinting(printer_state)}
              no_disabled={false}
            />
          </div>
        </div>
      </Fragment>
    )
  );
};

export default Cancel;
