import { h, Fragment } from 'preact';
import { StatusBoardTable, StatusBoardTableProps } from '../../components/status-board/board';
import { StatusProgress, StatusProgressProps } from "../../components/status-board/progress";
import { TempProps, Temperature } from "../../components/temperature";
import "./style.scss";


export interface homeProps extends TempProps {
  progress_bar: StatusProgressProps;
  progress_status: StatusBoardTableProps;

}

export const Home: preact.FunctionalComponent<homeProps> = props => {
  return (
    <Fragment>
      <div class="box has-background-black is-paddingless">
        <p class="title is-5 prusa-text-orange prusa-line">
          {process.env.PRINTER} <span class="subtitle is-6 has-text-grey">printer status</span>
        </p>
      </div>
      <div class="columns">
        <div class="column">
          <StatusProgress {...props.progress_bar} />
          <br />
          <Temperature temperatures={props.temperatures} bigSize={false} />
        </div>
        <div class="column">
          <StatusBoardTable {...props.progress_status} />
        </div>
      </div>
    </Fragment>
  );
};


