import { h } from 'preact';

export interface StatusProgressProps {
  readonly project_name: string,
  readonly progress: number
}

export const StatusProgress: preact.FunctionalComponent<StatusProgressProps> = props => {

  return (
    <div>
      <p class="title is-size-5 is-marginless">{props.project_name}</p>
      <progress class="progress is-success is-medium is-marginless" value={props.progress} max="100" />
      <div class="title has-text-centered">
        {`${props.progress}%`}
      </div>
    </div>
  );
};

