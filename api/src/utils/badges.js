export const BADGE_METRICS = Object.freeze({
    PUBLIC_ITINERARIES: 'publicItineraries',
    FOLLOWERS: 'followers',
    COUNTRIES: 'countries',
    PUBLIC_COUNTRIES: 'publicCountries',
    VAN_LOG_ENTRIES: 'vanLogEntries',
    LIFE_DIARY_ENTRIES: 'lifeDiaryEntries',
});

export const BADGE_FAMILIES = Object.freeze({
    TRIPS: 'trips',
    COUNTRIES: 'countries',
    FOLLOWERS: 'followers',
    VAN_LOG: 'vanLog',
    LIFE_DIARY: 'lifeDiary',
});

// Each badge is earned once its `metric` reaches `threshold`, and is kept
// from then on. Other users only see it while `publicMetric`, computed from
// public data alone, also reaches the threshold: badges without one come
// from private data (van log, life diary) and are only shown to their owner.
// Countries count everything (a country logged in the van log counts for
// the owner) but only public trips' countries count for everyone else.
export const BADGES = Object.freeze([
    { id: 'explorer', family: BADGE_FAMILIES.TRIPS, metric: BADGE_METRICS.PUBLIC_ITINERARIES, publicMetric: BADGE_METRICS.PUBLIC_ITINERARIES, threshold: 1 },
    { id: 'adventurer', family: BADGE_FAMILIES.TRIPS, metric: BADGE_METRICS.PUBLIC_ITINERARIES, publicMetric: BADGE_METRICS.PUBLIC_ITINERARIES, threshold: 5 },
    { id: 'globetrotter', family: BADGE_FAMILIES.TRIPS, metric: BADGE_METRICS.PUBLIC_ITINERARIES, publicMetric: BADGE_METRICS.PUBLIC_ITINERARIES, threshold: 10 },
    { id: 'countries_1', family: BADGE_FAMILIES.COUNTRIES, metric: BADGE_METRICS.COUNTRIES, publicMetric: BADGE_METRICS.PUBLIC_COUNTRIES, threshold: 1 },
    { id: 'countries_5', family: BADGE_FAMILIES.COUNTRIES, metric: BADGE_METRICS.COUNTRIES, publicMetric: BADGE_METRICS.PUBLIC_COUNTRIES, threshold: 5 },
    { id: 'countries_10', family: BADGE_FAMILIES.COUNTRIES, metric: BADGE_METRICS.COUNTRIES, publicMetric: BADGE_METRICS.PUBLIC_COUNTRIES, threshold: 10 },
    { id: 'countries_25', family: BADGE_FAMILIES.COUNTRIES, metric: BADGE_METRICS.COUNTRIES, publicMetric: BADGE_METRICS.PUBLIC_COUNTRIES, threshold: 25 },
    { id: 'popular', family: BADGE_FAMILIES.FOLLOWERS, metric: BADGE_METRICS.FOLLOWERS, publicMetric: BADGE_METRICS.FOLLOWERS, threshold: 50 },
    { id: 'van_log_1', family: BADGE_FAMILIES.VAN_LOG, metric: BADGE_METRICS.VAN_LOG_ENTRIES, threshold: 1 },
    { id: 'van_log_50', family: BADGE_FAMILIES.VAN_LOG, metric: BADGE_METRICS.VAN_LOG_ENTRIES, threshold: 50 },
    { id: 'van_log_200', family: BADGE_FAMILIES.VAN_LOG, metric: BADGE_METRICS.VAN_LOG_ENTRIES, threshold: 200 },
    { id: 'life_diary_1', family: BADGE_FAMILIES.LIFE_DIARY, metric: BADGE_METRICS.LIFE_DIARY_ENTRIES, threshold: 1 },
    { id: 'life_diary_10', family: BADGE_FAMILIES.LIFE_DIARY, metric: BADGE_METRICS.LIFE_DIARY_ENTRIES, threshold: 10 },
    { id: 'life_diary_50', family: BADGE_FAMILIES.LIFE_DIARY, metric: BADGE_METRICS.LIFE_DIARY_ENTRIES, threshold: 50 },
]);
