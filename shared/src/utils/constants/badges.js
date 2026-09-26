import { countryFlag, countryName } from './countries.js';
import { WORLD_MAP_SIZE } from './worldMapSize.js';

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
// Under the world map there's room for fewer seals than the map shows.
export const PASSPORT_SHARE_LIMITS = Object.freeze({ flagsOnly: 15, flagsWithAchievements: 5, stamps: 8 });

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
    // Without an earned stamp the panel would be empty, whatever was chosen.
    const showAchievements = (includeAchievements && earned.length > 0) || achievementsForced;
    const maxFlags = showAchievements ? PASSPORT_SHARE_LIMITS.flagsWithAchievements : PASSPORT_SHARE_LIMITS.flagsOnly;

    return {
        username: passport.owner.username,
        flagCodes: passport.countries.slice(0, maxFlags).map(country => country.code),
        // The world map has room for every one of them, unlike the seals.
        mapCodes: passport.countries.map(country => country.code),
        hiddenCountries: Math.max(countryCount - maxFlags, 0),
        countryCount,
        showAchievements,
        achievementsForced,
        stampIds: earned.slice(0, PASSPORT_SHARE_LIMITS.stamps).map(achievement => achievement.id),
        hiddenStamps: Math.max(earned.length - PASSPORT_SHARE_LIMITS.stamps, 0),
        earnedCount: earned.length,
    };
};

// The world map at the top of the shareable image's countries panel, in
// image pixels: the whole panel width, smaller when the achievements share
// the card. `gap` separates it from the seals under it.
const SHARE_CONTENT_WIDTH = 900;
const SHARE_MAP_WIDTH_WITH_ACHIEVEMENTS = 560;
const SHARE_MAP_GAP = 24;

export const passportShareMapLayout = (showAchievements) => {
    const width = showAchievements ? SHARE_MAP_WIDTH_WITH_ACHIEVEMENTS : SHARE_CONTENT_WIDTH;
    return { width, height: Math.round((width * WORLD_MAP_SIZE.height) / WORLD_MAP_SIZE.width), gap: SHARE_MAP_GAP };
};

// Countries per row under the map and their size, in image pixels: each flag
// in a round ink seal, as on the card of a single new country, with the
// country's name under it. A few countries get bigger seals; the size is the
// biggest that fits the space the map leaves.
const SHARE_COUNTRIES_CONTENT_HEIGHT_ALONE = 1140;
const SHARE_MORE_LABEL_HEIGHT = 80;
const SHARE_FEW_FLAGS = 8;
const SHARE_FLAGS_PER_ROW_FEW = 4;
const SHARE_MAX_FLAGS_PER_ROW = 5;
const SHARE_SEAL_TO_CELL_WIDTH = 0.84;
const SHARE_MAX_SEAL_DIAMETER = 300;
const SHARE_SEAL_DIAMETER_WITH_ACHIEVEMENTS = 120;
const SHARE_SEAL_SHRINK_STEP = 2;
const SHARE_FLAG_FONT_TO_SEAL = 0.5;
const SHARE_NAME_FONT_TO_SEAL = 0.16;
const SHARE_MIN_NAME_FONT_SIZE = 18;
const SHARE_NAME_LINE_HEIGHT = 1.6;
const SHARE_SEAL_ROW_GAP = 20;

const shareSealLayout = (perRow, sealDiameter) => {
    const nameFontSize = Math.max(Math.round(sealDiameter * SHARE_NAME_FONT_TO_SEAL), SHARE_MIN_NAME_FONT_SIZE);
    const nameLineHeight = Math.round(nameFontSize * SHARE_NAME_LINE_HEIGHT);
    return {
        perRow,
        sealDiameter,
        fontSize: Math.round(sealDiameter * SHARE_FLAG_FONT_TO_SEAL),
        nameFontSize,
        nameLineHeight,
        cellHeight: sealDiameter + nameLineHeight + SHARE_SEAL_ROW_GAP,
    };
};

export const passportShareFlagLayout = (flagCount, showAchievements) => {
    if (showAchievements) return shareSealLayout(SHARE_MAX_FLAGS_PER_ROW, SHARE_SEAL_DIAMETER_WITH_ACHIEVEMENTS);
    const perRow = flagCount <= SHARE_FEW_FLAGS ? SHARE_FLAGS_PER_ROW_FEW : SHARE_MAX_FLAGS_PER_ROW;
    const rows = Math.max(Math.ceil(flagCount / perRow), 1);
    const map = passportShareMapLayout(false);
    const room = SHARE_COUNTRIES_CONTENT_HEIGHT_ALONE - map.height - map.gap - SHARE_MORE_LABEL_HEIGHT;
    let layout = shareSealLayout(perRow, Math.round(Math.min((SHARE_CONTENT_WIDTH / perRow) * SHARE_SEAL_TO_CELL_WIDTH, SHARE_MAX_SEAL_DIAMETER)));
    while (rows * layout.cellHeight > room) layout = shareSealLayout(perRow, layout.sealDiameter - SHARE_SEAL_SHRINK_STEP);
    return layout;
};

// The earned badges on the shareable image: each emoji in a round ink seal,
// in image pixels.
export const PASSPORT_SHARE_STAMP_LAYOUT = Object.freeze({ perRow: 4, sealDiameter: 120, fontSize: 60, cellHeight: 140 });

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
// A `moment` ({ countryCode } or { badgeId }) opens the card of that single
// new country or badge instead of the whole passport.
export const PASSPORT_SHARE_MOMENT = 'moment';
export const PASSPORT_MOMENT_COUNTRY_PARAM = 'country';
export const PASSPORT_MOMENT_BADGE_PARAM = 'badge';
export const passportSharePath = (userId, { withAchievements = false, moment = null } = {}) => {
    const base = `/profile/${userId}/passport?${PASSPORT_SHARE_PARAM}=`;
    if (moment?.countryCode) {
        return `${base}${PASSPORT_SHARE_MOMENT}&${PASSPORT_MOMENT_COUNTRY_PARAM}=${encodeURIComponent(moment.countryCode)}`;
    }
    if (moment?.badgeId) {
        return `${base}${PASSPORT_SHARE_MOMENT}&${PASSPORT_MOMENT_BADGE_PARAM}=${encodeURIComponent(moment.badgeId)}`;
    }
    return `${base}${withAchievements ? PASSPORT_SHARE_WITH_ACHIEVEMENTS : PASSPORT_SHARE_COUNTRIES}`;
};

// Nothing earned yet (countries marked by hand give no stamp): the owner is
// shown how to get the first one.
export const isPassportUnstarted = (passport) => (
    passport.countries.length === 0 && !passport.achievements.some(achievement => achievement.earnedAt)
);

export const MOMENT_KINDS = Object.freeze({ COUNTRY: 'country', BADGE: 'badge' });

// The single new country or badge a notification pointed at, as the owner
// sees it in their passport, with whether only they see it (sharing it
// reveals it); null when it isn't in their passport (any more).
export const findPassportMoment = (passport, { countryCode, badgeId }) => {
    if (countryCode) {
        const country = passport.countries.find(visited => visited.code === countryCode);
        return country ? { kind: MOMENT_KINDS.COUNTRY, code: country.code, isPrivate: country.isPrivate } : null;
    }
    if (!badgeId) return null;
    const badge = passport.achievements.find(achievement => achievement.id === badgeId && achievement.earnedAt);
    // Private when its family is (van log, diary) or when others don't see it
    // earned, like a countries badge reached through van log countries.
    return badge ? { kind: MOMENT_KINDS.BADGE, code: badge.id, isPrivate: badge.isPrivate || badge.visibleToOthers === false } : null;
};

// What a moment card shows: the flag and name of a new country, or the emoji
// and name of a new badge. `t` is the i18next translate function.
export const describePassportMoment = (moment, t, language) => (moment.kind === MOMENT_KINDS.COUNTRY
    ? { symbol: countryFlag(moment.code), name: countryName(moment.code, language), title: t('passport.momentCountryTitle') }
    : { symbol: BADGE_EMOJI[moment.code], name: t(`badges.${moment.code}.name`), title: t('passport.momentBadgeTitle') });

// The sign-up link a passport visitor is offered, keeping the referral code
// the shared link came with, and saying where the sign-up came from.
export const SIGNUP_SOURCE_PARAM = 'source';
export const PASSPORT_SIGNUP_SOURCE = 'passport';
export const signupUrlFromPassport = (referralCode = null) => {
    const source = `${SIGNUP_SOURCE_PARAM}=${PASSPORT_SIGNUP_SOURCE}`;
    return referralCode ? `/register?${source}&ref=${encodeURIComponent(referralCode)}` : `/register?${source}`;
};
