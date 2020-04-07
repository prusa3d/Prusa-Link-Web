// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import { useTranslation } from "react-i18next";

import { network } from "../utils/network";
import { PrinterState } from "../telemetry";
import Title from "../title";
import { YesButton, NoButton } from "../buttons";
import { canCancelPrinting } from "../utils/states";

interface P extends network {
  printer_state: PrinterState;
  onBack(e: MouseEvent): void;
}

const Cancel: preact.FunctionalComponent<P> = ({
  printer_state,
  onBack,
  onFetch
}) => {
  const onYes = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFetch({
      url: "/api/job",
      then: response => onBack(e),
      options: {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          command: "cancel"
        })
      }
    });
  };

  const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
  const cancel_label = t("btn.cancel");
  return (
    ready && (
      <Fragment>
        <Title title={cancel_label} onFetch={onFetch} />
        <div class="columns is-multiline is-mobile is-centered is-vcentered">
          <div class="column is-full">
            <p class="prusa-default-text has-text-centered prusa-job-question">
              {t("msg.cancel")}
            </p>
          </div>
          <div class="column is-full">
            <div class="prusa-button-wrapper">
              <YesButton
                text={t("btn.yes")}
                onClick={onYes}
                wrap
                disabled={!canCancelPrinting(printer_state)}
              />
              <NoButton text={t("btn.no")} onClick={onBack} wrap />
            </div>
          </div>
        </div>
      </Fragment>
    )
  );
};

export default Cancel;
