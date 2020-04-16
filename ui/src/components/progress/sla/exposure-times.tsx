// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component, Fragment } from "preact";
import { Translation } from "react-i18next";

import { network } from "../../utils/network";
import Title from "../../title";
import { YesButton, NoButton } from "../../buttons";
import Loading from "../../loading";

interface P extends network {
  onBack(e: MouseEvent): void;
}

interface S {
  exposure_time_ms: number;
  exposure_time_first_ms: number;
}

interface ValuesProps {
  id: string;
  title: string;
  value: number;
  onChange(id: string, value: number): void;
  pvalue: number;
}

const range = {
  exposure_time_ms: [1, 60],
  exposure_time_first_ms: [10, 120],
  exposure_time_calibrate_ms: [0.5, 5]
};

const SetValueView: preact.FunctionalComponent<ValuesProps> = props => {
  const { id, title, value, onChange, pvalue } = props;
  const [min, max] = range[id];

  const onIncrease = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let newValue = value + pvalue;
    if (min <= newValue && newValue <= max) {
      onChange(id, newValue);
    }
  };

  const onDecrease = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let newValue = value - pvalue;
    if (min <= newValue && newValue <= max) {
      onChange(id, newValue);
    }
  };

  const onkeyPress = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let newValue;
    if (e.key == "=" || e.key == "+") {
      newValue = value + pvalue;
    } else if (e.key == "-") {
      newValue = value - pvalue;
    }

    if (min <= newValue && newValue <= max) {
      onChange(id, newValue);
    }
  };

  return (
    <div class="columns prusa-no-focus" tabIndex={0} onKeyDown={onkeyPress}>
      <div class="column is-three-fifths">
        <p class="prusa-default-text">{title}</p>
      </div>
      <div class="column">
        <img
          class="media-left image is-24x24 prusa-job-set-value"
          src={require("../../../assets/minus_color.svg")}
          onClick={e => onDecrease(e)}
        />
      </div>
      <div class="column prusa-default-text">{value}</div>
      <div class="column">
        <img
          class="media-left image is-24x24 prusa-job-set-value"
          src={require("../../../assets/plus_color.svg")}
          onClick={e => onIncrease(e)}
        />
      </div>
    </div>
  );
};

class ExposureTimes extends Component<P, S> {
  state = {
    exposure_time_ms: -1,
    exposure_time_first_ms: -1,
    exposure_time_calibrate_ms: -1
  };

  onChange = (id: string, value: number) => {
    this.setState(prevState => ({ ...prevState, [id]: value }));
  };

  onSave = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    this.props.onFetch({
      url: "/api/properties",
      then: response => this.props.onBack(e),
      options: {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          exposure_time_ms: this.state.exposure_time_ms * 1000,
          exposure_time_first_ms: this.state.exposure_time_first_ms * 1000,
          exposure_time_calibrate_ms:
            this.state.exposure_time_calibrate_ms * 1000
        })
      }
    });
  };

  componentDidMount = () => {
    this.props.onFetch({
      url: "/api/properties?values=exposure_times",
      then: response =>
        response.json().then(data => {
          if (data) {
            this.setState(prev => ({
              ...prev,
              exposure_time_ms: data.exposure_time_ms / 1000,
              exposure_time_first_ms: data.exposure_time_first_ms / 1000,
              exposure_time_calibrate_ms:
                data.calibration_regions > 0
                  ? data.exposure_time_calibrate_ms / 1000
                  : -1
            }));
          }
        })
    });
  };

  render(
    { onBack, onFetch },
    { exposure_time_ms, exposure_time_first_ms, exposure_time_calibrate_ms }
  ) {
    return (
      // @ts-ignore
      <Translation useSuspense={false}>
        {(t, { i18n }, ready) =>
          ready && (
            <Fragment>
              <Title title={t("exp-times.title")} onFetch={onFetch} />
              <div class="columns is-multiline is-mobile is-centered is-vcentered">
                {exposure_time_ms > 0 ? (
                  <div class="column is-half-desktop prusa-job-question">
                    <SetValueView
                      id="exposure_time_ms"
                      title={t("exp-times.exp-time")}
                      value={exposure_time_ms}
                      onChange={this.onChange}
                      pvalue={0.5}
                    />
                    {exposure_time_calibrate_ms > 0 && (
                      <SetValueView
                        id="exposure_time_calibrate_ms"
                        title={t("exp-times.inc")}
                        value={exposure_time_calibrate_ms}
                        onChange={this.onChange}
                        pvalue={0.5}
                      />
                    )}
                    <SetValueView
                      id="exposure_time_first_ms"
                      title={t("exp-times.layer-1st")}
                      value={exposure_time_first_ms}
                      onChange={this.onChange}
                      pvalue={1}
                    />
                  </div>
                ) : (
                  <Loading />
                )}
                <div class="column is-full">
                  <div class="prusa-button-wrapper">
                    <YesButton
                      text={t("btn.save-chgs").toLowerCase()}
                      onClick={this.onSave}
                      wrap
                    />
                    <NoButton
                      text={t("btn.cancel").toLowerCase()}
                      onClick={onBack}
                      wrap
                    />
                  </div>
                </div>
              </div>
            </Fragment>
          )
        }
      </Translation>
    );
  }
}

export default ExposureTimes;
