import { h, Component, Fragment } from "preact";
import StatusProgress from "./progress";
import { update, updateProjectName } from "../telemetry/progress";

let StatusBoardTable;
let initState;
if (process.env.PRINTER == "Original Prusa SL1") {
  initState = require("./board-sl1").initState;
  StatusBoardTable = require("./board-sl1").StatusBoardSL1;
} else {
  initState = require("./board-mini").initState;
  StatusBoardTable = require("./board-mini").StatusBoardMini;
}

interface P {
  isJob?: boolean;
  isPrinting: boolean;
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

  shouldComponentUpdate = ({ isPrinting }, nextState) => {
    if (this.wasPrinting == isPrinting) {
      if (isPrinting) {
        return true;
      } else {
        return false;
      }
    } else {
      this.wasPrinting = isPrinting;
      if (isPrinting) {
        updateProjectName(this.updateData);
        update(this.updateData, this.clearData)();
        if (!this.timer) {
          this.timer = setInterval(
            update(this.updateData, this.clearData),
            Number(process.env.UPDATE_PROGRESS)
          );
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
    if (this.props.isPrinting) {
      updateProjectName(this.updateData);
      update(this.updateData, this.clearData)();
      this.timer = setInterval(
        update(this.updateData, this.clearData),
        Number(process.env.UPDATE_PROGRESS)
      );
    }
  };

  componentWillUnmount = () => {
    if (this.timer) {
      clearInterval(this.timer);
    }
  };

  updateData = data => {
    this.setState((prevState, props) => ({ ...prevState, ...data }));
  };

  clearData = () => {
    this.wasPrinting = false;
    this.setState(prev => ({ ...defaultState }));
  };

  render({ isJob, isPrinting }, { project_name, progress, ...others }) {
    const class_name = isJob
      ? "column is-full"
      : "column is-full-touch is-half-desktop";
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
