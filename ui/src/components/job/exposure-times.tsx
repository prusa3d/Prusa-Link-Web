// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component, Fragment } from 'preact';
import { Text } from 'preact-i18n';
import Title from "../title"
import YesNoView from "./yes-no"

interface P {
  onBack(e: MouseEvent): void;
}

interface S {
  exposure_time_ms: number;
  exposure_time_first_ms: number;
}

interface ValuesProps {
  title_id: string;
  title_default: string;
  value: number;
  onChange(id: string, value: number): void;
}

const range = {
  exposure_time_ms: [1, 60],
  exposure_time_first_ms: [10, 120]
}

const SetValueView: preact.FunctionalComponent<ValuesProps> = props => {

  const { title_id, title_default, value, onChange } = props;
  const [min, max] = range[title_id];

  const onIncrease = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let newValue = value + 1
    if (min <= newValue && newValue <= max) {
      onChange(title_id, newValue);
    }

  };

  const onDecrease = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let newValue = value - 1
    if (min <= newValue && newValue <= max) {
      onChange(title_id, newValue);
    }
  };

  const onkeyPress = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let newValue;
    if (e.key == "=" || e.key == "+") {
      newValue = value + 1
    } else if (e.key == "-") {
      newValue = value - 1
    }

    if (min <= newValue && newValue <= max) {
      onChange(title_id, newValue);
    }

  }

  return (
    <div class="columns prusa-no-focus" tabIndex={0} onKeyDown={onkeyPress}>
      <div class="column is-half">
        <p class="title is-size-5 is-size-6-desktop">
          <Text id={`project.${title_id}`} >
            {title_default}
          </Text>
        </p>
      </div >
      <div class="column">
        <img
          class="media-left image is-24x24 prusa-job-set-value" src={require("../../assets/minus_color.svg")} onClick={e => onDecrease(e)} />
      </div>
      <div class="column">
        {value}
      </div>
      <div class="column">
        <img class="media-left image is-24x24 prusa-job-set-value" src={require("../../assets/plus_color.svg")} onClick={e => onIncrease(e)} />
      </div>
    </div>
  );
};

class ExposureTimes extends Component<P, S> {

  state = {
    exposure_time_ms: range.exposure_time_ms[0],
    exposure_time_first_ms: range.exposure_time_first_ms[0]
  }

  onChange = (id: string, value: number) => {
    this.setState(prevState => ({ ...prevState, [id]: value }));
  }

  onSave = (e: MouseEvent) => {

    const onBack = this.props.onBack;
    fetch('/api/properties', {
      method: 'POST',
      headers: {
        "X-Api-Key": process.env.APIKEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "exposure_time_ms": this.state.exposure_time_ms * 1000,
        "exposure_time_first_ms": this.state.exposure_time_first_ms * 1000
      })
    }).then(function (response) {
      if (response.ok) {
        onBack(e);
      }
      return response;
    });

  }

  componentDidMount = () => {

    fetch('/api/properties?values=exposure_time_ms,exposure_time_first_ms', {
      method: 'GET',
      headers: {
        "X-Api-Key": process.env.APIKEY,
        "Accept": "application/json"
      }
    })
      .then(response => response.json())
      .then(data => {
        this.setState({ ...data });
        this.setState(prev => ({
          exposure_time_ms: data.exposure_time_ms
            ? data.exposure_time_ms / 1000
            : prev.exposure_time_ms,
          exposure_time_first_ms: data.exposure_time_first_ms
            ? data.exposure_time_first_ms / 1000
            : prev.exposure_time_first_ms
        }));
      });

  }

  render({ onBack }, { exposure_time_ms, exposure_time_first_ms }) {
    return (
      <Fragment>
        <Title id="project.change-exposure" default_text="Change exposure times" />
        <div class="columns is-multiline is-mobile is-centered is-vcentered">
          <div class="column is-half prusa-job-question">
            <SetValueView
              title_id="exposure_time_ms"
              title_default="exposure time"
              value={exposure_time_ms}
              onChange={this.onChange}
            />
            <SetValueView
              title_id="exposure_time_first_ms"
              title_default="first layer"
              value={exposure_time_first_ms}
              onChange={this.onChange}
            />
          </div>
          <div class="column is-full">
            <YesNoView
              no_id="cancel"
              no_text="cancel"
              onNO={onBack}
              yes_id="save-changes"
              yes_text="save changes"
              onYES={this.onSave}
            />
          </div>
        </div>
      </Fragment>
    );
  }
}

export default ExposureTimes;