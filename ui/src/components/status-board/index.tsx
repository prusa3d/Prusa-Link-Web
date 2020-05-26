import { h, Component, Fragment } from "preact";

import { network } from "../utils/network";
import StatusProgress from "./progress";
import { isPrinting } from "../utils/states";
import { PrinterState } from "../telemetry";

let StatusBoardTable;
let initState;
if (process.env.IS_SL1) {
  initState = require("./board-sla").initState;
  StatusBoardTable = require("./board-sla").StatusBoardSL1;
} else {
  initState = require("./board-mini").initState;
  StatusBoardTable = require("./board-mini").StatusBoardMini;
}

interface P extends network {
  isHalf?: boolean;
  printer_state: PrinterState;
}

interface S {
  project_name: string;
  progress: number;
}

const defaultState = { ...initState, project_name: "", progress: 0 };
class StatusBoard extends Component<P, S> {
  timer = null;
  wasPrinting: boolean = false;
  state = defaultState;

  shouldComponentUpdate = ({ printer_state }, nextState) => {
    const is_printing = isPrinting(printer_state);
    if (this.wasPrinting == is_printing) {
      if (is_printing) {
        return true;
      } else {
        return false;
      }
    } else {
      this.wasPrinting = is_printing;
      if (is_printing) {
        this.updateProjectName();
        this.updateData();
        const update = this.updateData;
        if (!this.timer) {
          this.timer = setInterval(function() {
            update();
          }, Number(process.env.UPDATE_PROGRESS));
        }
        return true;
      } else {
        if (this.timer) {
          clearInterval(this.timer);
          this.clearData();
        }
        return true;
      }
    }
  };

  componentDidMount = () => {
    if (isPrinting(this.props.printer_state)) {
      this.updateProjectName();
      this.updateData();
      const update = this.updateData;
      this.timer = setInterval(function() {
        update();
      }, Number(process.env.UPDATE_PROGRESS));
    }
  };

  componentWillUnmount = () => {
    if (this.timer) {
      clearInterval(this.timer);
    }
  };

  updateProjectName = () => {
    this.props.onFetch({
      url: "/api/project-name",
      then: response =>
        response
          .json()
          .then(data =>
            this.setState((prevState, props) => ({ ...prevState, ...data }))
          ),
      except: e =>
        this.setState((prevState, props) => ({
          ...prevState,
          project_name: ""
        }))
    });
  };

  updateData = () => {
    this.props.onFetch({
      url: "/api/progress",
      then: response =>
        response.json().then(data => {
          this.setState((prevState, props) => ({ ...prevState, ...data }));
        }),
      except: e => this.clearData()
    });
  };

  clearData = () => {
    this.wasPrinting = false;
    this.setState(prev => ({ ...defaultState }));
  };

  render(props, { project_name, progress, ...others }) {
    const class_name = props.isHalf
      ? "column is-full-touch is-half-desktop"
      : "column is-full";
    return (
      <Fragment>
        <div class={class_name}>
          <StatusProgress project_name={project_name} progress={progress} />
        </div>
        <div class={class_name}>
          <StatusBoardTable {...others} />
        </div>
      </Fragment>
    );
  }
}

export default StatusBoard;
