// Display side of the badge catalog; which badges exist and what earns them
// is decided by the API (api/src/utils/badges.js).
export const BADGE_EMOJI = Object.freeze({
    explorer: '🧭',
    adventurer: '🎒',
    globetrotter: '🌍',
    countries_1: '🛂',
    countries_5: '🗺️',
    countries_10: '✈️',
    countries_25: '🏆',
    popular: '⭐',
    van_log_1: '⛽',
    van_log_50: '🧾',
    van_log_200: '🚐',
    life_diary_1: '📓',
    life_diary_10: '📖',
    life_diary_50: '📚',
});

export const BADGE_FAMILY_ORDER = Object.freeze(['trips', 'countries', 'followers', 'vanLog', 'lifeDiary']);

// What the profile's passport card shows: a few flags of visited countries,
// the stamp count and, for the owner (who gets `current`), the locked stamp
// they are closest to, as a nudge.
export const summarizePassport = (passport, maxFlags) => {
    if (!passport) return null;
    const { achievements = [], countries = [] } = passport;

    const inProgress = achievements
        .filter(achievement => !achievement.earnedAt && achievement.current != null)
        .map(achievement => ({ achievement, progress: achievement.current / achievement.threshold }));
    // Closest to done first; on a tie, the family shown first on the passport.
    inProgress.sort((a, b) => b.progress - a.progress
        || BADGE_FAMILY_ORDER.indexOf(a.achievement.family) - BADGE_FAMILY_ORDER.indexOf(b.achievement.family));
    const closest = inProgress[0]?.achievement;

    return {
        flagCodes: countries.slice(0, maxFlags).map(country => country.code),
        hiddenCountries: Math.max(countries.length - maxFlags, 0),
        countryCount: countries.length,
        earnedCount: achievements.filter(achievement => achievement.earnedAt).length,
        totalCount: achievements.length,
        nextGoal: closest
            ? { badgeId: closest.id, family: closest.family, remaining: closest.threshold - closest.current }
            : null,
    };
};

// How much fits on the shareable image (1080x1920). The countries panel
// takes the whole card when the achievements are left out.
export const PASSPORT_SHARE_LIMITS = Object.freeze({ flagsOnly: 25, flagsWithAchievements: 15, stamps: 8 });

// What the shareable passport image shows. Works on either version of the
// passport: the public one by default, or the owner's full one when they
// choose to include private stamps and countries. Only earned stamps count.
export const summarizePassportForSharing = (passport, { includeAchievements }) => {
    const earned = passport.achievements
        .filter(achievement => achievement.earnedAt)
        .sort((a, b) => BADGE_FAMILY_ORDER.indexOf(a.family) - BADGE_FAMILY_ORDER.indexOf(b.family));
    const countryCount = passport.countries.length;
    // Countries alone would leave an empty card, so the stamps show anyway.
    const achievementsForced = countryCount === 0 && earned.length > 0;
    const showAchievements = includeAchievements || achievementsForced;
    const maxFlags = showAchievements ? PASSPORT_SHARE_LIMITS.flagsWithAchievements : PASSPORT_SHARE_LIMITS.flagsOnly;

    return {
        username: passport.owner.username,
        flagCodes: passport.countries.slice(0, maxFlags).map(country => country.code),
        hiddenCountries: Math.max(countryCount - maxFlags, 0),
        countryCount,
        showAchievements,
        achievementsForced,
        stampIds: earned.slice(0, PASSPORT_SHARE_LIMITS.stamps).map(achievement => achievement.id),
        hiddenStamps: Math.max(earned.length - PASSPORT_SHARE_LIMITS.stamps, 0),
        earnedCount: earned.length,
    };
};

// Flags per row and their size on the shareable image, in image pixels.
// With the whole card to themselves, a few countries get fewer, bigger flags
// instead of a small row lost in an empty panel.
const SHARE_CONTENT_WIDTH = 900;
const SHARE_FLAGS_PER_ROW_BY_COUNT = [[4, 2], [9, 3], [16, 4]];
const SHARE_MAX_FLAGS_PER_ROW = 5;
const SHARE_MAX_FLAG_FONT_SIZE = 220;
const SHARE_FLAG_FONT_TO_CELL_WIDTH = 0.78;
const SHARE_FLAG_CELL_HEIGHT_TO_FONT = 1.43;
const SHARE_FLAGS_WITH_ACHIEVEMENTS_LAYOUT = Object.freeze({ perRow: SHARE_MAX_FLAGS_PER_ROW, fontSize: 110, cellHeight: 160 });

export const passportShareFlagLayout = (flagCount, showAchievements) => {
    if (showAchievements) return SHARE_FLAGS_WITH_ACHIEVEMENTS_LAYOUT;
    const perRow = SHARE_FLAGS_PER_ROW_BY_COUNT.find(([maxCount]) => flagCount <= maxCount)?.[1] ?? SHARE_MAX_FLAGS_PER_ROW;
    const fontSize = Math.round(Math.min((SHARE_CONTENT_WIDTH / perRow) * SHARE_FLAG_FONT_TO_CELL_WIDTH, SHARE_MAX_FLAG_FONT_SIZE));
    return { perRow, fontSize, cellHeight: Math.round(fontSize * SHARE_FLAG_CELL_HEIGHT_TO_FONT) };
};

// With the owner's referral code, whoever signs up from a shared passport
// counts as invited by them (and both get the referral reward).
export const passportUrl = (webUrl, userId, referralCode = null) => {
    const url = `${webUrl}/profile/${userId}/passport`;
    return referralCode ? `${url}?ref=${encodeURIComponent(referralCode)}` : url;
};

// Opens the owner's passport on the web with the share dialog already open,
// from a new country or badge notification: the moment they most want to
// show it off.
export const PASSPORT_SHARE_PARAM = 'share';
export const PASSPORT_SHARE_WITH_ACHIEVEMENTS = 'achievements';
export const PASSPORT_SHARE_COUNTRIES = 'countries';
export const passportSharePath = (userId, { withAchievements = false } = {}) => (
    `/profile/${userId}/passport?${PASSPORT_SHARE_PARAM}=${withAchievements ? PASSPORT_SHARE_WITH_ACHIEVEMENTS : PASSPORT_SHARE_COUNTRIES}`
);

// The sign-up link a passport visitor is offered, keeping the referral code
// the shared link came with, and saying where the sign-up came from.
export const SIGNUP_SOURCE_PARAM = 'source';
export const PASSPORT_SIGNUP_SOURCE = 'passport';
export const signupUrlFromPassport = (referralCode = null) => {
    const source = `${SIGNUP_SOURCE_PARAM}=${PASSPORT_SIGNUP_SOURCE}`;
    return referralCode ? `/register?${source}&ref=${encodeURIComponent(referralCode)}` : `/register?${source}`;
};
