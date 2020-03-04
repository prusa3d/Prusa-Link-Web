export function numberFormat(value: number) {
  if (value > 0) {
    return value.toFixed(2);
  } else {
    return 0;
  }
}

export function formatTime(value: number) {
  const minutes = Math.floor((value / 60000) % 60);
  const hours = Math.floor((value / 3600000) % 24);
  if (hours > 0) {
    return (
      hours +
      " h " +
      ("0" + Math.floor((value / (1000 * 60)) % 60)).substr(-2) +
      " min"
    );
  }
  if (minutes > 0) {
    return minutes + " min";
  }
  return "0 min";
}

export function formatTimeEnd(value: number) {
  if (value) {
    let now = new Date();
    let end = new Date(now.getTime() + value);
    return (
      ("0" + end.getHours()).substr(-2) +
      ":" +
      ("0" + end.getMinutes()).substr(-2)
    );
  } else {
    return "00:00";
  }
}

export function available(value: number | string, unit: string = null) {
  return value ? value + (unit ? " " + unit : "") : "NA";
}
