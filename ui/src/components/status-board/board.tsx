import { h, Fragment } from 'preact';

interface StatusBoardItemProps {
  title: string,
  value: string | number
}

export interface StatusBoardTableProps {
  remaining_time: string,
  estimated_end: string,
  printing_time: string,
  current_layer: number,
  total_layers: number,
  remaining_material: string | number,
  consumed_material: string | number
}

const StatusBoardItem = (props: StatusBoardItemProps) => {
  return (
    <div class="column is-one-third">
      <p class="subtitle is-6 has-text-grey">
        {props.title}
      </p>
      <p class="title is-5 has-text-white">
        {props.value}
      </p>
    </div>
  );
};

export const StatusBoardTable = (props: StatusBoardTableProps) => {
  return (
    <Fragment>
      <div class="columns">
        <StatusBoardItem title="remaining time" value={props.remaining_time} />
        <StatusBoardItem title="estimated end" value={props.estimated_end} />
        <StatusBoardItem title="printing time" value={props.printing_time} />
      </div>
      <div class="columns">
        <StatusBoardItem title="layer" value={`${props.current_layer}/${props.total_layers}`} />
        <StatusBoardItem title="remaining resin" value={`${props.remaining_material} ml`} />
        <StatusBoardItem title="consumed resin" value={`${props.consumed_material} ml`} />
      </div>
    </Fragment>
  );
};
