// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";
import { useTranslation } from "react-i18next";

import { formatTime, formatEstimatedTime } from "../utils/format";

interface P {
  printing_time: string;
  layer_height: number;
}

interface S {
  exposure_times: string;
  last_modified: string;
  remaining_time: string;
  total_layers: number | string;
  estimated_end: string;
  consumed_resin: string;
  remaining_resin: string;
}

class Properties extends Component<P, S> {
  state = {
    exposure_times: "NA",
    last_modified: "NA",
    remaining_time: "NA",
    total_layers: "NA",
    estimated_end: "NA",
    consumed_resin: "NA",
    remaining_resin: "NA"
  };

  componentDidMount = () => {
    fetch("/api/before-confirm", {
      method: "GET",
      headers: {
        "X-Api-Key": process.env.APIKEY,
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    })
      .then(response => response.json())
      .then(data => {
        const dt = new Date(data.last_modified);
        const last_modified = dt.toDateString() + " " + dt.toTimeString();
        const result = {
          exposure_times: data.exposure_times,
          last_modified: last_modified.substring(0, 25),
          remaining_time: formatTime(data.remaining_time, "NA", "NA"),
          estimated_end: formatEstimatedTime(data.remaining_time),
          total_layers: data.total_layers,
          consumed_resin: data.consumed_resin,
          remaining_resin: data.remaining_resin
        };

        this.setState(prevState => ({ ...prevState, ...result }));
      });
  };

  render(
    { printing_time, layer_height },
    {
      exposure_times,
      last_modified,
      remaining_time,
      total_layers,
      estimated_end,
      consumed_resin,
      remaining_resin
    }
  ) {
    const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
    return (
      ready && (
        <div class="columns is-multiline is-mobile">
          <div class="column is-full">
            <div class="columns">
              <div class="column is-1 proj-icon">
                <img src={require("../../assets/time_color.svg")} />
              </div>
              <div class="column is-4">
                <p class="proj-text"> {t("prop.rem-time").toLowerCase()}</p>
                <p class="proj-text-value">{remaining_time}</p>
              </div>
              <div class="column is-4">
                <p class="proj-text">{t("prop.est-end").toLowerCase()}</p>
                <p class="proj-text-value">{estimated_end}</p>
              </div>
              <div class="column">
                <p class="proj-text">{t("prop.pnt-time").toLowerCase()}</p>
                <p class="proj-text-value">
                  {printing_time ? printing_time : "NA"}
                </p>
              </div>
            </div>
          </div>

          <div class="column is-full">
            <div class="columns">
              <div class="column is-1 proj-icon">
                <img src={require("../../assets/quality_medium.svg")} />
              </div>
              <div class="column is-4">
                <p class="proj-text">{t("prop.layers").toLowerCase()}</p>
                <p class="proj-text-value">{total_layers}</p>
              </div>
              <div class="column is-4">
                <p class="proj-text">{t("prop.layer-ht").toLowerCase()}</p>
                <p class="proj-text-value">
                  {layer_height ? `${layer_height} mm` : "NA"}
                </p>
              </div>
            </div>
          </div>

          <div class="column is-full">
            <div class="columns">
              <div class="column is-1 proj-icon">
                <img src={require("../../assets/refill_color.svg")} />
              </div>
              <div class="column is-4">
                <p class="proj-text">{t("prop.sla-rmn-mt").toLowerCase()}</p>
                <p class="proj-text-value">{remaining_resin}</p>
              </div>
              <div class="column is-4">
                <p class="proj-text">{t("prop.sla-csm-mt").toLowerCase()}</p>
                <p class="proj-text-value">{consumed_resin}</p>
              </div>
            </div>
          </div>

          <div class="column is-full">
            <div class="columns">
              <div class="column is-1 proj-icon">
                <img src={require("../../assets/exposure_times_color.svg")} />
              </div>
              <div class="column">
                <p class="proj-text">{t("prop.exp-times").toLowerCase()}</p>
                <p class="proj-text-value">{exposure_times}</p>
              </div>
            </div>
          </div>

          <div class="column is-full">
            <div class="columns">
              <div class="column is-1 proj-icon">
                <img src={require("../../assets/calendar.svg")} />
              </div>
              <div class="column">
                <p class="proj-text">{t("prop.last-mod").toLowerCase()}</p>
                <p class="proj-text-value">{last_modified}</p>
              </div>
            </div>
          </div>
        </div>
      )
    );
  }
}

export default Properties;
