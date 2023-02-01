import { LinkState, translateState } from "../state";

const SEPARATOR = " - ";

export const getPrinterLabel = (context) => {
  return buildTitle([context.version?.location, context.version?.name]);
};

export const buildTitle = (titleItems) => {
  return [...titleItems]
    .filter((i) => !!i)
    .map((i) => i.trim())
    .join(SEPARATOR);
};

export const getStatusForTitle = (context) => {
  const linkState = LinkState.fromApi(context.printer.state);
  let stateText = translateState(linkState);

  switch (linkState) {
    case 'IDLE':
      return '';

    case 'PRINTING':
      const progress = Math.round((context?.current?.progress?.completion || 0) * 100);
      return `${stateText} ${progress}%`;

    default:
      return stateText;
  }
}
