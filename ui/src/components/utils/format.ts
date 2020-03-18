export function numberFormat(value: number) {
  if (value > 0) {
    let precision = value.toString().indexOf(".") + 1;
    if (value.toString().length - precision > 3) {
      return Number.parseFloat(value.toPrecision(precision));
    } else {
      return value;
    }
  } else {
    return 0;
  }
}

export function formatTime(value: number, less_than: string, na: string) {
  if (value) {
    if (value < 60000) {
      return less_than;
    }
    const minutes = Math.floor((value / 60000) % 60);
    const hours = Math.floor((value / 3600000) % 24);
    if (hours > 0) {
      return hours + " h " + ("0" + minutes).substr(-2) + " min";
    }
    if (minutes > 0) {
      return minutes + " min";
    }
  } else {
    return na;
  }
}

export function formatEstimatedTime(value: number) {
  if (value) {
    let now = new Date();
    let end = new Date(now.getTime() + value);
    const days = Math.abs(end.getDate() - now.getDate());
    let plus_days = "";
    if (days == 1) {
      plus_days = "Tomorrow ";
    } else if (days > 1) {
      plus_days = `${days} D+ `;
    }
    return (
      plus_days +
      (("0" + end.getHours()).substr(-2) +
        ":" +
        ("0" + end.getMinutes()).substr(-2))
    );
  } else {
    return "00:00";
  }
}

export function available(value: number | string, unit: string = null) {
  return value ? value + (unit ? " " + unit : "") : "NA";
}
