// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import { useTranslation } from "react-i18next";

import { network } from "../utils/network";
import Title from "../title";
import { YesButton, NoButton } from "../buttons";
import Toast from "../toast";

export interface DeleteProps extends network {
  url: string;
  display: string;
  onCancel(e: MouseEvent): void;
  onConfirm(e: MouseEvent): void;
}

const notify = () => {
  const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
  return new Promise<string>(function(resolve, reject) {
    if (ready) {
      resolve(t("ntf.actn-pending"));
    }
  }).then(message => Toast.info(t("btn.cancel-pt"), message));
};

export const Delete: preact.FunctionalComponent<DeleteProps> = ({
  url,
  onCancel,
  onConfirm,
  display,
  onFetch
}) => {
  const onYes = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFetch({
      url,
      then: response => {
        onConfirm(e);
        notify();
      },
      options: {
        method: "DELETE",
        headers: {}
      }
    });
  };

  const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
  return (
    ready && (
      <Fragment>
        <Title title={t("proj.del")} onFetch={onFetch} />
        <div class="columns is-multiline is-mobile is-centered is-vcentered">
          <div class="column is-full">
            <p class="txt-normal txt-size-2 has-text-centered prusa-job-question">
              {t("msg.del-proj", { file_name: display })}
            </p>
          </div>
          <div class="column is-full">
            <div class="prusa-button-wrapper">
              <YesButton
                text={t("btn.yes").toLowerCase()}
                onClick={onYes}
                wrap
              />
              <NoButton
                text={t("btn.no").toLowerCase()}
                onClick={onCancel}
                wrap
              />
            </div>
          </div>
        </div>
      </Fragment>
    )
  );
};

export default Delete;
