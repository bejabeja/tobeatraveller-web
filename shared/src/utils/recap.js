// The yearly recap is an event: offered through December and January for the
// year that is ending or just ended. Same rule as the API (RecapService), in
// UTC, so the apps show the way in exactly when the API has a recap to give.
const DECEMBER = 11;
const JANUARY = 0;

export const recapYear = (now = new Date()) => {
    const month = now.getUTCMonth();
    if (month === DECEMBER) return now.getUTCFullYear();
    if (month === JANUARY) return now.getUTCFullYear() - 1;
    return null;
};

// How long each slide stays before moving on by itself, like other stories.
export const RECAP_SLIDE_DURATION_MS = 5000;

export const RECAP_SLIDES = Object.freeze({
    COVER: 'cover',
    COUNTRIES: 'countries',
    DAYS: 'days',
    TRIPS: 'trips',
    VAN: 'van',
    DIARY: 'diary',
    BADGES: 'badges',
    SHARE: 'share',
    EMPTY: 'empty',
});

// The slides a recap has: one per part of the year with something in it,
// between the cover and the share slide.
export const recapSlides = (recap) => {
    if (!recap?.hasActivity) return [RECAP_SLIDES.EMPTY];
    return [
        RECAP_SLIDES.COVER,
        recap.countries.codes.length > 0 && RECAP_SLIDES.COUNTRIES,
        recap.daysOnRoad > 0 && RECAP_SLIDES.DAYS,
        recap.trips.count > 0 && RECAP_SLIDES.TRIPS,
        (recap.vanLog.nights > 0 || recap.vanLog.refuels > 0) && RECAP_SLIDES.VAN,
        recap.diary.entries > 0 && RECAP_SLIDES.DIARY,
        recap.badges.length > 0 && RECAP_SLIDES.BADGES,
        RECAP_SLIDES.SHARE,
    ].filter(Boolean);
};

export const MAX_RECAP_SHARE_FLAGS = 12;

// What the recap's share image shows: figures only, never diary text or
// place names (the recap itself stays private). As on the passport image,
// the countries only the owner sees go out only if they choose to.
export const summarizeRecapForSharing = (recap, username, { includePrivate = false } = {}) => {
    const privateCodes = new Set(recap.countries.privateCodes ?? []);
    const shareable = (codes) => (includePrivate ? codes : codes.filter(code => !privateCodes.has(code)));
    const codes = shareable(recap.countries.codes);
    return {
        username,
        year: recap.year,
        countryCount: codes.length,
        newCountryCount: shareable(recap.countries.newCodes).length,
        flagCodes: codes.slice(0, MAX_RECAP_SHARE_FLAGS),
        hiddenCountries: Math.max(codes.length - MAX_RECAP_SHARE_FLAGS, 0),
        daysOnRoad: recap.daysOnRoad,
        nights: recap.vanLog.nights,
        stamps: recap.badges.length,
        hasPrivateCountries: privateCodes.size > 0,
    };
};
