const CALENDAR_DAY_LENGTH = "YYYY-MM-DD".length;

// A date as its calendar day ("YYYY-MM-DD"). Postgres gives a DATE column as
// local midnight, so it's read with local getters; a day that arrives as
// text is kept as it is, since new Date() would read it as UTC midnight
// (the day before, west of Greenwich).
export function toCalendarDay(value) {
    if (!value) return null;
    if (typeof value === "string") return value.slice(0, CALENDAR_DAY_LENGTH);
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${day}`;
}

export function formatDate(date) {
    const options = { year: "numeric", month: "long" };
    return new Date(date).toLocaleDateString("en-US", options);
}
export function formatDateRange(startDate, endDate) {
    const options = { day: "numeric", month: "short" };
    const start = new Date(startDate);
    const end = new Date(endDate);

    const sameMonth = start.getMonth() === end.getMonth();
    const sameYear = start.getFullYear() === end.getFullYear();

    if (sameMonth && sameYear) {
        return `${start.getDate()}–${end.getDate()} ${start.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
    } else {
        return `${start.toLocaleDateString("en-US", options)} – ${end.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
        })}`;
    }
}
export function timeAgo(date) {
    const now = new Date();
    const past = new Date(date);
    const seconds = Math.floor((now - past) / 1000);

    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 },
        { label: 'second', seconds: 1 },
    ];

    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) {
            const label = count === 1 ? interval.label : `${interval.label}s`;
            return `${count} ${label} ago`;
        }
    }

    return 'just now';
}
