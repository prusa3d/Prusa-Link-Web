import { h } from "preact";
import { Text } from "preact-i18n";

interface P {
  id: string;
  title: string;
  value: string | number;
}

const StatusBoardItem: preact.FunctionalComponent<P> = ({
  id,
  title,
  value
}) => {
  return (
    <div class="column is-one-third">
      <p class="subtitle is-size-3 is-size-6-desktop has-text-grey">
        <Text id={`status-board.${id}`}>{title}</Text>
      </p>
      <p class="title is-size-3 is-size-6-desktop has-text-white">{value}</p>
    </div>
  );
};

export default StatusBoardItem;
