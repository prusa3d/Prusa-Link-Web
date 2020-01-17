import { h, Fragment, Component } from 'preact';
import { StatusBoardTable, StatusBoardTableProps } from '../../components/status-board/board';
import { StatusProgress, StatusProgressProps } from "../../components/status-board/progress";
import { TempProps, Temperature } from "../../components/temperature";

import "./style.scss";


function pad2(value) {
  if (value < 10) {
    return "0" + value
  } else {
    return "" + value
  }
}

function formatTime(date) {
  let hours = date.getUTCHours()
  let minutes = date.getUTCMinutes()
  if (hours > 0) {
    return hours + " h " + pad2(minutes) + " mim"
  }
  return minutes + " mim"
}


interface S extends StatusBoardTableProps, StatusProgressProps {
}

class Home extends Component<TempProps, S> {

  ws = null;

  constructor() {
    super();
    this.state = {
      remaining_time: "",
      estimated_end: "00:00",
      printing_time: "",
      current_layer: 0,
      total_layers: 0,
      remaining_material: 0,
      consumed_material: 0,
      progress: 0,
      project_name: ""
    };
    this.connect = this.connect.bind(this);
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

        for (let item of Object.keys(content)) {
          if (item.startsWith("time_r")) {

            let remaining = new Date(content[item] * 1000 * 60);
            newState["remaining_time"] = formatTime(remaining);

            let now = new Date();
            let end = new Date(now.getTime() + content[item] * 1000 * 60);
            newState["estimated_end"] = pad2(end.getHours()) + ":" + pad2(end.getMinutes());

          } else if (item.startsWith("time_e")) {
            let elapsed = new Date(content[item] * 1000 * 60);
            newState["printing_time"] = formatTime(elapsed);
          }
          else if (item.endsWith("ml")) {
            let value = content[item];
            let precision = value.toString().indexOf(".") + 1;
            if (value.toString().length - precision > 3) {
              value = Number.parseFloat(content[item].toPrecision(precision));
            }
            if (item.endsWith("d_ml")) {
              newState["consumed_material"] = value;
            } else if (item.endsWith("g_ml")) {
              newState["remaining_material"] = value;
            } else {
              newState[item] = value;
            }
          } else {
            if (item === "current_layer" ||
              item === "total_layers" ||
              item === "project_name" ||
              item === "progress"
            ) {
              newState[item] = content[item];
            }

          }
        }
        if (Object.keys(newState).length > 0) {
          this.setState(newState);
        }

      }

    }
  }

  componentWillUnmount() {
    this.ws.close();
  }

  render() {
    return (
      <Fragment>
        <div class="box has-background-black is-paddingless">
          <p class="title is-5 prusa-text-orange prusa-line">
            {process.env.PRINTER} <span class="subtitle is-6 has-text-grey">printer status</span>
          </p>
        </div>
        <div class="columns">
          <div class="column">
            <StatusProgress progress={this.state.progress} project_name={this.state.project_name} />
            <br />
            <Temperature data={this.props.data} />
          </div>
          <div class="column">
            <StatusBoardTable {...this.state} />
          </div>
        </div>
      </Fragment>
    );
  }


};

export default Home;
