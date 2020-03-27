import { h } from "preact";

interface P {
  title: string;
  value: string | number;
}

const StatusBoardItem: preact.FunctionalComponent<P> = ({ title, value }) => {
  return (
    <div class="column is-one-third">
      <p class="prusa-default-text-grey">{title}</p>
      <p class="prusa-default-bold-text">{value}</p>
    </div>
  );
};

export default StatusBoardItem;
