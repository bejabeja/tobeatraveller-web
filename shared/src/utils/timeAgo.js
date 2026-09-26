// How long ago `date` was, as the i18n key and count the apps show
// ("hace 3 h"): the key is time.<unit>Ago, time.justNow under a minute.
const UNITS = [
    { key: 'time.yearsAgo', seconds: 365 * 24 * 3600 },
    { key: 'time.monthsAgo', seconds: 30 * 24 * 3600 },
    { key: 'time.daysAgo', seconds: 24 * 3600 },
    { key: 'time.hoursAgo', seconds: 3600 },
    { key: 'time.minutesAgo', seconds: 60 },
];

export const timeAgo = (date, now = new Date()) => {
    const seconds = Math.max(0, Math.floor((now - new Date(date)) / 1000));
    for (const { key, seconds: unit } of UNITS) {
        const count = Math.floor(seconds / unit);
        if (count >= 1) return { key, count };
    }
    return { key: 'time.justNow', count: 0 };
};

// The same, already written with the apps' `t`.
export const formatTimeAgo = (t, date, now) => {
    const { key, count } = timeAgo(date, now);
    return t(key, { count });
};
