// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import { useTranslation } from "react-i18next";

import { network } from "../../utils/network";
import { canAct } from "../../utils/states";
import Title from "../../title";
import StatusBoard from "../../../components/status-board";
import { PrinterState } from "../../telemetry";
import { NoButton, ActionButton } from "../../buttons";
import Toast from "../../toast";

interface P extends network {
  printer_state: PrinterState;
  onclick(nextShow: number): void;
  isHalf: boolean;
  children?: any;
}

const JobProgress: preact.FunctionalComponent<P> = props => {
  const onclick = (e: Event, nextShow: number) => {
    e.preventDefault();
    e.stopPropagation();
    props.onclick(nextShow);
  };

  const notify = () => {
    const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
    return new Promise<string>(function(resolve, reject) {
      if (ready) {
        resolve(t("ntf.actn-pending"));
      }
    }).then(message => Toast.notify(t("refill.title"), message));
  };

  const onFeed = e => {
    props.onFetch({
      url: "/api/job/material?value=start",
      then: _ => {
        onclick(e, 2);
        notify();
      },
      except: _ => {
        onclick(e, 0);
      }
    });
  };

  const { t, i18n, ready } = useTranslation(null, { useSuspense: false });

  let title;
  if (ready) {
    if (props.isHalf) {
      title = (
        <Title title={t("home.title") + ": "} onFetch={props.onFetch}>
          <span class="txt-orange">{t("prop.st-printing")}</span>
        </Title>
      );
    } else {
      title = <Title title={t("proj.title")} onFetch={props.onFetch} />;
    }
  }

  return (
    ready && (
      <Fragment>
        {title}
        <div class="columns is-multiline is-mobile">
          <StatusBoard
            printer_state={props.printer_state}
            isHalf={props.isHalf}
            onFetch={props.onFetch}
          />
          <div class="column is-full">
            <div class="prusa-button-wrapper">
              <ActionButton
                icon="exp-times"
                text={t("btn.chg-exp").toLowerCase()}
                onClick={e => onclick(e, 1)}
                wrap
              />
              <ActionButton
                icon="refill"
                text={t("btn.sla-refill").toLowerCase()}
                onClick={e => onFeed(e)}
                disabled={!canAct(props.printer_state)}
                wrap
              />
              <NoButton
                text={t("btn.cancel-pt").toLowerCase()}
                onClick={e => onclick(e, 3)}
                disabled={!canAct(props.printer_state)}
                wrap
              />
            </div>
          </div>
          {props.children && props.children}
        </div>
      </Fragment>
    )
  );
};

export default JobProgress;
