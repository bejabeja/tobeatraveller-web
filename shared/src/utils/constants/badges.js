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
