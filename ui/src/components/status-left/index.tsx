import { h, Fragment, Component } from 'preact';
import { histUpdate } from "../app";
import StatusLeftItem from "./item";

interface S {
  readonly remaining_material?: string;
  readonly temp_cpu?: string;
  readonly temp_led?: string;
  readonly temp_amb?: string;
  readonly uv_led_fan?: string;
  readonly blower_fan?: string;
  readonly rear_fan?: string;
  readonly cover_state?: string;
  readonly nozzle?: string;
  readonly heatbed?: string;
  readonly speed?: string;
  readonly flow?: string;
  readonly height?: string;
  readonly material?: string;
}


class StatusLeftBoard extends Component<histUpdate, S> {

  ws = null;

  constructor() {
    super();
    this.state = {
      remaining_material: "0 ml",
      temp_cpu: "0°C",
      temp_led: "0°C",
      temp_amb: "0°C",
      uv_led_fan: "0 RPM",
      blower_fan: "0 RPM",
      rear_fan: "0 RPM",
      cover_state: "",
    };
  }

  componentDidMount() {
    this.connect();

  }
  connect = () => {

    // this.ws =  new WebSocket("ws://" + window.location.host + "/ws");
    this.ws = new WebSocket("ws://localhost:8080/ws");

    this.ws.onclose = () => {
      this.setState({});
    };

    let that = this;
    this.ws.onerror = () => {
      this.setState({});
      this.ws.close();
      setTimeout(function () { that.connect(); }, 3000);
    };

    this.ws.onmessage = (e) => {
      var data = JSON.parse(e.data);
      if (data.type == "items") {
        let content = data.content;
        let newState: { [propName: string]: string; } = {};
        let newTemps = { temp_led: 0, temp_amb: 0, temp_cpu: 0 };
        for (let item of Object.keys(content)) {
          if (item.endsWith("g_ml") || item.startsWith("temp_")) {
            let value = content[item];
            let precision = value.toString().indexOf(".") + 1;
            if (value.toString().length - precision > 3) {
              value = Number.parseFloat(content[item].toPrecision(precision));
            }
            if (item.endsWith("g_ml")) {
              newState["remaining_material"] = `${value} ml`;
            } else {
              newTemps[item] = value;
              newState[item] = `${value}°C`;
            }
          } else if (item.endsWith("_fan")) {
            newState[item] = `${content[item]} RPM`;
          } else if (item == "cover_closed") {
            newState["cover_state"] = content[item] ? "Closed" : "Opened";
          }
        }
        if (Object.keys(newState).length > 0) {
          this.setState(newState);
          this.props.updateTempHistory(newTemps);
        }

      }
    }

  }

  componentWillUnmount() {
    this.ws.close();
  }

  render() {

    const listItems = Object.keys(this.state).map(propType =>
      <StatusLeftItem type={propType} value={this.state[propType]} />
    );

    return (
      <Fragment>
        <div class="tile is-ancestor is-vertical">
          {listItems.length < 1 ? "Loading..." : listItems}
        </div>
      </Fragment>);

  }

}



export default StatusLeftBoard;