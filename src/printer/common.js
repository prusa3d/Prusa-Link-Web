import { LinkState, translateState } from "../state";

const SEPARATOR = " - ";

export const getPrinterLabel = (context) => buildTitle([
  context.printer?.location || context.printer?.hostname,
  context.printer?.name
]);

export const buildTitle = (titleItems) => {
  return [...titleItems]
    .filter((i) => !!i)
    .map((i) => i.trim())
    .join(SEPARATOR);
};

export const getStatusForTitle = (context) => {
  const linkState = context.state;
  let stateText = translateState(linkState);

  switch (linkState) {
    case 'IDLE':
      return '';

    case 'PRINTING':
      const progress = Math.round((context?.job?.progress || 0));
      return `${stateText} ${progress}%`;

    default:
      return stateText;
  }
}

export const getEstimatedEnd = (timeRemaining) => Math.round(Date.now() / 1000) + timeRemaining;