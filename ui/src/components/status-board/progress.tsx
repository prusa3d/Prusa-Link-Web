import { h, Fragment } from 'preact';

export interface StatusProgressProps {
  project_name: string,
  progress: number
}

export const StatusProgress: preact.FunctionalComponent<StatusProgressProps> = props => {

  let progress = props.progress * 100;
  let precision = progress.toString().indexOf(".");
  if (progress.toString().length - precision > 3) {
    progress = Number.parseFloat(progress.toPrecision(precision));
  }

  return (
    <Fragment>
      <div>
  <p class="title is-size-5 is-marginless">{props.project_name}</p>
        <progress class="progress is-success is-medium is-marginless" value={props.progress} max="100" />
        <div class="title has-text-centered">
          {`${progress}%`}
        </div>
      </div>
    </Fragment>
  );
};

