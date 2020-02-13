// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from 'preact';
import StatusLeftItem from "./item";

interface S {
  temp_cpu?: string;
  temp_led?: string;
  temp_amb?: string;
  uv_led_fan?: string;
  blower_fan?: string;
  rear_fan?: string;
  cover_state?: boolean;
  nozzle?: string;
  heatbed?: string;
  speed?: string;
  flow?: string;
  height?: string;
  material?: string;
}

interface P {
  updateData(data: any): void;
  clearData(): void;
}

function numberFormat(value) {
  let precision = value.toString().indexOf(".") + 1;
  if (value.toString().length - precision > 3) {
    return Number.parseFloat(value.toPrecision(precision));
  } else {
    return value;
  }
};


function formatTime(date) {
  let hours = "0" + date.getHours();
  let minutes = "0" + date.getMinutes();
  return hours.substr(-2) + ':' + minutes.substr(-2);
};

const initState = {
  temp_cpu: "0°C",
  temp_led: "0°C",
  temp_amb: "0°C",
  uv_led_fan: "0 RPM",
  blower_fan: "0 RPM",
  rear_fan: "0 RPM",
  cover_state: false,
};

class StatusLeftBoard extends Component<P, S> {

  timer: any;
  constructor() {
    super();
    this.state = initState;
  }

  clearData = () => {
    this.props.clearData();
    this.setState(prev => ({ ...initState }));
  }

  componentDidMount() {
    this.timer = setInterval(this.connect, Number(process.env.UPDATE_TIMER));
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }
  connect = () => {

    fetch('/api/job/progress', {
      method: 'GET',
      headers: {
        "X-Api-Key": process.env.APIKEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    })
      .then(response => response.json())
      .then(data => {

        let newState: { [propName: string]: string | boolean; } = {};
        let newTemps = {};
        let newProgress_status = {};
        let newProgress_bar = {};
        let value = null;

        // progress properties
        value = data["time_remain"];
        if (value || value === 0) {
          let remaining = new Date(value);
          newProgress_status["remaining_time"] = formatTime(remaining);

          let now = new Date();
          let end = new Date(now.getTime() + value);
          newProgress_status["estimated_end"] = ("0" + end.getHours()).substr(-2) + ":" + ("0" + end.getMinutes()).substr(-2);
        } else {
          newProgress_status["remaining_time"] = "";
          newProgress_status["estimated_end"] = "00:00";
        }

        value = data["time_elapsed"];
        if (value) {
          let elapsed = new Date(value);
          newProgress_status["printing_time"] = formatTime(elapsed);
        } else {
          newProgress_status["printing_time"] = "";
        }

        value = data["material_used_ml"];
        newProgress_status["consumed_material"] = value ? `${numberFormat(value)} ml` : "0 ml";
        value = data["material_remaining_ml"];
        newProgress_status["remaining_material"] = value ? `${numberFormat(value)} ml` : "0 ml";

        for (let item of ["current_layer", "total_layers"]) {
          value = data[item];
          newProgress_status[item] = value ? value : 0;
        }

        value = data["project_name"];
        newProgress_bar["project_name"] = value ? value : "";
        value = data["progress"];
        newProgress_bar["progress"] = value ? value : 0;

        // left board properties
        for (let item of ["temp_cpu", "temp_led", "temp_amb"]) {
          value = data[item];
          if (value) {
            newTemps[item] = value;
            newState[item] = `${numberFormat(value)}°C`;
          } else {
            newState[item] = "0°C";
          }
        }

        for (let item of ["uv_led_fan", "blower_fan", "rear_fan"]) {
          value = data[item];
          newState[item] = value ? `${value} RPM` : "0 RPM";
        }

        value = data["cover_closed"];
        if (typeof (value) == "boolean") {
          newState["cover_state"] = value;
        }

        if (Object.keys(newState).length > 0) {
          this.setState(newState);
          this.props.updateData({
            progress_bar: newProgress_bar,
            progress_status: newProgress_status,
            temperatures: [[new Date().getTime(), newTemps["temp_cpu"], newTemps["temp_led"], newTemps["temp_amb"]]]
          });
        }
      }).catch(e => this.clearData());
  }

  render() {

    const listItems = Object.keys(this.state).map(propType =>
      <StatusLeftItem type={propType} value={this.state[propType]} />
    );

    return (
      <div class="columns is-multiline is-mobile">
        {listItems.length < 1 ? "Loading..." : listItems}
      </div>
    );

  }

}



export default StatusLeftBoard;