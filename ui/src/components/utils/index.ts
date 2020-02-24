export function numberFormat(value) {
    let precision = value.toString().indexOf(".") + 1;
    if (value.toString().length - precision > 3) {
        return Number.parseFloat(value.toPrecision(precision));
    } else {
        return value;
    }
};

export function formatTime(value: number) {
    const minutes = Math.floor((value / 60000) % 60);
    const hours = Math.floor((value / 3600000) % 24);
    if (hours > 0) {
        return hours + " h " + ("0" + Math.floor((value / (1000 * 60)) % 60)).substr(-2) + " min"
    }
    if (minutes > 0) {
        return minutes + " min"
    }
    return ""
};

export function formatTimeEnd(value: number) {
    let now = new Date();
    let end = new Date(now.getTime() + value);
    return ("0" + end.getHours()).substr(-2) + ":" + ("0" + end.getMinutes()).substr(-2);
}
