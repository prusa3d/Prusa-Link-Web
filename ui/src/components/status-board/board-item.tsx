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
      <p class="prusa-default-text-grey">
        <Text id={`status-board.${id}`}>{title}</Text>
      </p>
      <p class="prusa-default-text">{value}</p>
    </div>
  );
};

export default StatusBoardItem;
