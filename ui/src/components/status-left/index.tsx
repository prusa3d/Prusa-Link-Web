import { h, Fragment, Component } from 'preact';
import "./style.scss";
import status_nozzle from "../../assets/status_nozzle.svg";
import status_heatbed from "../../assets/status_heatbed.svg";
import status_prnspeed from "../../assets/status_prnspeed.svg";
import status_prnflow from "../../assets/status_prnflow.svg";
import status_z_axis from "../../assets/status_z_axis.svg";
import status_material from "../../assets/status_filament.svg";

interface StatusLeftItemProps {
  type: string,
  value: string | number
};

interface StatusLeftBoardProps {
  nozzle: string | number,
  heatbed: string | number,
  speed: string | number,
  flow: string | number,
  height: string | number,
  material: string | number
}

const title_icon: { [id: string]: { title: string, icon_scr: string } } = {
  nozzle: { title: "Nozzle Temperature", icon_scr: status_nozzle },
  heatbed: { title: "Heatbed", icon_scr: status_heatbed },
  speed: { title: "Printing Speed", icon_scr: status_prnspeed },
  flow: { title: "Printing Flow", icon_scr: status_prnflow },
  height: { title: "Z-Height", icon_scr: status_z_axis },
  material: { title: "Material", icon_scr: status_material }
};

const StatusLeftItem = (props: StatusLeftItemProps) => {
  let { title, icon_scr } = title_icon[props.type];

  let className = "tile box has-background-black";
  if (title[0] === "N") {
    className += " not-padding-bottom";
  } else {
    className += " not-padding-top-bottom";
  }

  return (
    <div
      class={className}
    >
      <div class="media">
        <figure class="media-left">
          <p class="image is-16x16">
            <img src={icon_scr} />
          </p>
        </figure>
        <div class="media-content is-clipped">
          <p class="subtitle is-6 has-text-white">
            {title}
          </p>
          <p class="title is-5 has-text-white">
            {props.value}
          </p>
        </div>
      </div>
    </div>
  );
};

class StatusLeftBoard extends Component {

  constructor() {
    super();
    this.state = {
      nozzle: "0/0°C",
      heatbed: "0/0°C",
      speed: "100%",
      flow: "100%",
      height: "23.15 mm",
      material: "PLA"
    };
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
    return (
      <Fragment>
        <div class="box has-background-grey is-marginless is-paddingless is-radiusless prusa-line-top"></div>
        <div class="tile is-ancestor is-vertical">
          <StatusLeftItem type="nozzle" value={this.state.nozzle} />
          <StatusLeftItem type="heatbed" value={this.state.heatbed} />
          <StatusLeftItem type="speed" value={this.state.speed} />
          <StatusLeftItem type="flow" value={this.state.flow} />
          <StatusLeftItem type="height" value={this.state.height} />
          <StatusLeftItem type="material" value={this.state.material} />
        </div>
      </Fragment>
    );
  }
}


export default StatusLeftBoard;