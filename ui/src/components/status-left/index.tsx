import { h, Fragment, Component } from 'preact';
import StatusLeftItem from "./item";

interface S {
  [propName: string]: string;
}

class StatusLeftBoard extends Component<{}, S> {

  constructor() {
    super();
    if (process.env.PRINTER == "Prusa SL1") {
      this.state = {
        resin_remaining: "0 ml",
        temp_cpu: "0°C",
        temp_led: "0°C",
        temp_amb: "0°C",
        uv_led_fan: "0 RPM",
        blower_fan: "0 RPM",
        rear_fan: "0 RPM",
        cover_state: "",
      };

    } else {
      this.state = {
        nozzle: "0/0°C",
        heatbed: "0/0°C",
        speed: "100%",
        flow: "100%",
        height: "23.15 mm",
        material: "PLA"
      };
    }

  }

  // componentDidMount() {

  //   let { apiKey, baseURL } = this.props.config;

  //   fetch(baseURL + '/octoprint/api/printer', { headers: { "X-Api-Key": apiKey } })
  //     .then(response => response.json())
  //     .then(data => this.setState({ data }));


  //   // this.timer = setInterval(() => {
  //   //   this.setState({ time: Date.now() });
  //   // }, 1000);
  // }


  // componentWillUnmount() {
  //   // clearInterval(this.timer);
  // }

  render() {

    Object.keys(this.state).map(propType => console.log(propType));
    const listItems = Object.keys(this.state).map(propType =>
      <StatusLeftItem type={propType} value={this.state[propType]} />
    );

    return (
      <Fragment>
        <div class="tile is-ancestor is-vertical">
          {listItems}
        </div>
      </Fragment>
    );
  }
}


export default StatusLeftBoard;