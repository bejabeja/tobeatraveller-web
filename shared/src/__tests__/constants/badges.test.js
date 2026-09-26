import { describe, expect, it } from 'vitest';
import { BADGES as API_BADGES } from '../../../../api/src/utils/badges.js';
import { ISO_COUNTRY_CODES } from '../../../../api/src/utils/countryCodes.js';
import {
    BADGE_EMOJI, BADGE_FAMILY_ORDER, PASSPORT_SHARE_LIMITS, PASSPORT_SHARE_STAMP_LAYOUT, passportShareFlagLayout, passportShareMapLayout,
    passportUrl, summarizePassport,
    describePassportMoment, findPassportMoment, isPassportUnstarted, passportSharePath, signupUrlFromPassport, summarizePassportForSharing,
} from '../../utils/constants/badges.js';
import en from '../../locales/en.json';
import { WORLD_MAP } from '../../utils/constants/worldMap.js';
import es from '../../locales/es.json';

// The API decides which badges exist; the apps only know how to show them.
// A badge added to one side and not the other would render as a raw key.
describe('badge catalog shared by the API and the apps', () => {
    it.each(API_BADGES.map(badge => [badge.id, badge]))('has an emoji and texts in both languages for %s', (id) => {
        expect(BADGE_EMOJI[id]).toBeTruthy();
        for (const locale of [es, en]) {
            expect(locale.badges[id]?.name).toBeTruthy();
            expect(locale.badges[id]?.desc).toBeTruthy();
            // Shown on the locked stamp in the passport.
            expect(locale.badges[id]?.goal).toBeTruthy();
        }
    });

    it('shows every family the API uses, each with its "next badge" hint and passport heading', () => {
        const apiFamilies = [...new Set(API_BADGES.map(badge => badge.family))];

        expect([...BADGE_FAMILY_ORDER].sort()).toEqual(apiFamilies.sort());
        for (const locale of [es, en]) {
            apiFamilies.forEach(family => expect(locale.badges.nextTip[`${family}_other`]).toBeTruthy());
            apiFamilies.forEach(family => expect(locale.passport.family[family]).toBeTruthy());
        }
    });
});

describe('summarizePassport', () => {
    const stamp = (id, family, threshold, extra = {}) => ({ id, family, threshold, earnedAt: null, isPrivate: false, ...extra });
    const country = (code) => ({ code, firstVisitedOn: '2026-03-01', isPrivate: false });
    const EARNED = '2026-09-01';

    it('shows the first countries as flags and counts the rest', () => {
        const summary = summarizePassport({ achievements: [], countries: ['FI', 'ES', 'FR', 'IT', 'PT'].map(country) }, 3);

        expect(summary.flagCodes).toEqual(['FI', 'ES', 'FR']);
        expect(summary.hiddenCountries).toBe(2);
        expect(summary.countryCount).toBe(5);
    });

    it('counts the earned stamps out of the ones the viewer can see', () => {
        const summary = summarizePassport({
            achievements: [stamp('explorer', 'trips', 1, { earnedAt: EARNED }), stamp('adventurer', 'trips', 5)],
            countries: [],
        }, 3);

        expect(summary.earnedCount).toBe(1);
        expect(summary.totalCount).toBe(2);
    });

    it('points the owner at the locked stamp they are closest to', () => {
        const summary = summarizePassport({
            achievements: [
                stamp('adventurer', 'trips', 5, { current: 1 }),
                stamp('countries_5', 'countries', 5, { current: 3 }),
                stamp('van_log_50', 'vanLog', 50, { current: 10 }),
            ],
            countries: [],
        }, 3);

        expect(summary.nextGoal).toEqual({ badgeId: 'countries_5', family: 'countries', remaining: 2 });
    });

    it('breaks a tie by the passport family order', () => {
        const summary = summarizePassport({
            achievements: [stamp('van_log_1', 'vanLog', 1, { current: 0 }), stamp('explorer', 'trips', 1, { current: 0 })],
            countries: [],
        }, 3);

        expect(summary.nextGoal.badgeId).toBe('explorer');
    });

    // Other viewers get no progress, so there is nothing to nudge them with.
    it('has no next goal without progress data', () => {
        const summary = summarizePassport({ achievements: [stamp('adventurer', 'trips', 5)], countries: [] }, 3);

        expect(summary.nextGoal).toBeNull();
    });

    it('has no next goal once everything is earned', () => {
        const summary = summarizePassport({
            achievements: [stamp('explorer', 'trips', 1, { earnedAt: EARNED, current: 4 })],
            countries: [],
        }, 3);

        expect(summary.nextGoal).toBeNull();
    });

    it('returns null while the passport is not loaded', () => {
        expect(summarizePassport(null, 3)).toBeNull();
    });
});

describe('summarizePassportForSharing', () => {
    const stamp = (id, family, earnedAt = '2026-09-01') => ({ id, family, threshold: 1, earnedAt, isPrivate: false });
    const country = (code) => ({ code, firstVisitedOn: '2026-03-01', isPrivate: false });
    const codes = (count) => ISO_COUNTRY_CODES.slice(0, count);
    const passport = ({ countries = [], achievements = [] } = {}) => ({
        owner: { username: 'jane' }, countries: countries.map(country), achievements,
    });

    it('shows only the countries by default, with room for more flags', () => {
        const summary = summarizePassportForSharing(
            passport({ countries: codes(30), achievements: [stamp('explorer', 'trips')] }),
            { includeAchievements: false },
        );

        expect(summary.showAchievements).toBe(false);
        expect(summary.flagCodes).toHaveLength(PASSPORT_SHARE_LIMITS.flagsOnly);
        expect(summary.hiddenCountries).toBe(30 - PASSPORT_SHARE_LIMITS.flagsOnly);
        expect(summary).toMatchObject({ username: 'jane', countryCount: 30 });
    });

    // The map has room for them all, unlike the seals under it.
    it('paints every shared country on the map, not only the ones that fit as seals', () => {
        const summary = summarizePassportForSharing(passport({ countries: codes(30) }), { includeAchievements: false });

        expect(summary.mapCodes).toEqual(codes(30));
    });

    it('makes room for the achievements when they are included', () => {
        const summary = summarizePassportForSharing(
            passport({ countries: codes(30), achievements: [stamp('explorer', 'trips')] }),
            { includeAchievements: true },
        );

        expect(summary.showAchievements).toBe(true);
        expect(summary.flagCodes).toHaveLength(PASSPORT_SHARE_LIMITS.flagsWithAchievements);
    });

    // As when the owner's only stamps are private and they go back to the
    // public passport with the achievements still on.
    it('leaves the achievements out, even when included, if there is no earned stamp to show', () => {
        const summary = summarizePassportForSharing(passport({ countries: codes(30), achievements: [] }), { includeAchievements: true });

        expect(summary.showAchievements).toBe(false);
        expect(summary.flagCodes).toHaveLength(PASSPORT_SHARE_LIMITS.flagsOnly);
    });

    // Countries alone would leave nothing on the card.
    it('shows the achievements anyway when there are no countries but there are stamps', () => {
        const summary = summarizePassportForSharing(
            passport({ achievements: [stamp('explorer', 'trips')] }),
            { includeAchievements: false },
        );

        expect(summary.showAchievements).toBe(true);
        expect(summary.achievementsForced).toBe(true);
    });

    it('shows only the earned stamps, in passport family order, and counts the rest', () => {
        const achievements = [
            stamp('popular', 'followers'),
            stamp('adventurer', 'trips', null),
            ...['countries_1', 'countries_5', 'countries_10', 'countries_25'].map(id => stamp(id, 'countries')),
            stamp('van_log_1', 'vanLog'),
            stamp('life_diary_1', 'lifeDiary'),
            stamp('explorer', 'trips'),
            stamp('globetrotter', 'trips'),
        ];

        const summary = summarizePassportForSharing(passport({ countries: ['ES'], achievements }), { includeAchievements: true });

        expect(summary.stampIds).toEqual(['explorer', 'globetrotter', 'countries_1', 'countries_5', 'countries_10', 'countries_25', 'popular', 'van_log_1']);
        expect(summary.earnedCount).toBe(9);
        expect(summary.hiddenStamps).toBe(1);
    });

    it('builds the link to the passport on the web', () => {
        expect(passportUrl('https://tobeatraveller.com', 'user-1')).toBe('https://tobeatraveller.com/profile/user-1/passport');
    });

    it("carries the owner's referral code in the shared link", () => {
        expect(passportUrl('https://tobeatraveller.com', 'user-1', 'jane.doe'))
            .toBe('https://tobeatraveller.com/profile/user-1/passport?ref=jane.doe');
    });

    it('links to the card of a single new country or badge, ready to share', () => {
        expect(passportSharePath('user-1', { moment: { countryCode: 'IT' } })).toBe('/profile/user-1/passport?share=moment&country=IT');
        expect(passportSharePath('user-1', { moment: { badgeId: 'countries_5' } })).toBe('/profile/user-1/passport?share=moment&badge=countries_5');
    });

    it('links to the passport with the share dialog open, with or without the achievements', () => {
        expect(passportSharePath('user-1')).toBe('/profile/user-1/passport?share=countries');
        expect(passportSharePath('user-1', { withAchievements: true })).toBe('/profile/user-1/passport?share=achievements');
    });

    it('keeps the referral code in the sign-up link offered to a visitor, and marks where it came from', () => {
        expect(signupUrlFromPassport('jane doe')).toBe('/register?source=passport&ref=jane%20doe');
        expect(signupUrlFromPassport(null)).toBe('/register?source=passport');
    });
});

describe('passportShareFlagLayout', () => {
    // The countries panel alone is 1250px tall, 1140px under its title; next
    // to the achievements it is 720px, 610px under its title. The world map
    // goes first, then the seals; a "+N" line takes 80px more. 900px wide.
    const COUNTRIES_ALONE_CONTENT_HEIGHT = 1140;
    const COUNTRIES_WITH_ACHIEVEMENTS_CONTENT_HEIGHT = 610;
    const MORE_LABEL_HEIGHT = 80;
    const CONTENT_WIDTH = 900;
    const mapSpace = (withAchievements) => {
        const map = passportShareMapLayout(withAchievements);
        return map.height + map.gap;
    };

    it('gives a few countries fewer, bigger seals per row', () => {
        const few = passportShareFlagLayout(3, false);
        const many = passportShareFlagLayout(PASSPORT_SHARE_LIMITS.flagsOnly, false);

        expect(few.perRow).toBeLessThan(many.perRow);
        expect(few.fontSize).toBeGreaterThan(many.fontSize);
        expect(few.sealDiameter).toBeGreaterThan(many.sealDiameter);
    });

    it.each([1, 4, 5, 8, 9, 12, 15])('fits the map, %i seals and the "+N" line in the countries panel alone', (count) => {
        const { perRow, cellHeight } = passportShareFlagLayout(count, false);
        const rows = Math.ceil(count / perRow);

        expect(mapSpace(false) + rows * cellHeight + MORE_LABEL_HEIGHT).toBeLessThanOrEqual(COUNTRIES_ALONE_CONTENT_HEIGHT);
    });

    it('fits the map, the most seals and the "+N" line next to the achievements', () => {
        const count = PASSPORT_SHARE_LIMITS.flagsWithAchievements;
        const { perRow, cellHeight } = passportShareFlagLayout(count, true);

        expect(mapSpace(true) + Math.ceil(count / perRow) * cellHeight + MORE_LABEL_HEIGHT).toBeLessThanOrEqual(COUNTRIES_WITH_ACHIEVEMENTS_CONTENT_HEIGHT);
    });

    it.each([[3, false], [9, false], [15, false], [5, true]])('leaves room around each seal and its name (%i countries, achievements: %s)', (count, withAchievements) => {
        const { perRow, sealDiameter, nameFontSize, nameLineHeight, cellHeight } = passportShareFlagLayout(count, withAchievements);

        expect(sealDiameter).toBeLessThan(CONTENT_WIDTH / perRow);
        expect(nameLineHeight).toBeGreaterThan(nameFontSize);
        expect(sealDiameter + nameLineHeight).toBeLessThan(cellHeight);
    });

    it('fits the flag inside the seal, and keeps it bigger than the name under it', () => {
        const { fontSize, nameFontSize, sealDiameter } = passportShareFlagLayout(PASSPORT_SHARE_LIMITS.flagsOnly, false);

        expect(fontSize).toBeLessThan(sealDiameter);
        expect(fontSize).toBeGreaterThan(nameFontSize);
    });
});

describe('passportShareMapLayout', () => {
    it('keeps the world map in proportion, within the panel', () => {
        for (const withAchievements of [false, true]) {
            const { width, height } = passportShareMapLayout(withAchievements);

            expect(width).toBeLessThanOrEqual(900);
            expect(width / height).toBeCloseTo(WORLD_MAP.width / WORLD_MAP.height, 1);
        }
    });

    it('makes the map smaller when the achievements share the card', () => {
        expect(passportShareMapLayout(true).width).toBeLessThan(passportShareMapLayout(false).width);
    });
});

describe('PASSPORT_SHARE_STAMP_LAYOUT', () => {
    // The achievements panel is 480px tall, 370px under its title; a "+N"
    // line takes 80px more. The grid is 900px wide.
    it('fits the most badges shown, plus the "+N" line, in the achievements panel', () => {
        const { perRow, cellHeight } = PASSPORT_SHARE_STAMP_LAYOUT;

        expect(Math.ceil(PASSPORT_SHARE_LIMITS.stamps / perRow) * cellHeight + 80).toBeLessThanOrEqual(370);
    });

    it('fits each emoji inside its seal, and each seal in its cell', () => {
        const { perRow, sealDiameter, fontSize, cellHeight } = PASSPORT_SHARE_STAMP_LAYOUT;

        expect(fontSize).toBeLessThan(sealDiameter);
        expect(sealDiameter).toBeLessThan(900 / perRow);
        expect(sealDiameter).toBeLessThan(cellHeight);
    });
});

describe('isPassportUnstarted', () => {
    const passport = (overrides) => ({ countries: [], achievements: [{ id: 'explorer', earnedAt: null }], ...overrides });

    it('is unstarted with no country and no stamp earned', () => {
        expect(isPassportUnstarted(passport())).toBe(true);
    });

    it('is started once a country is stamped', () => {
        expect(isPassportUnstarted(passport({ countries: [{ code: 'PT' }] }))).toBe(false);
    });

    it('is started once any stamp is earned, even without countries', () => {
        expect(isPassportUnstarted(passport({ achievements: [{ id: 'popular', earnedAt: '2026-09-01' }] }))).toBe(false);
    });

    // They show on the passport but give no stamp: the first stamp is still to get.
    it('is still unstarted with only countries marked by hand', () => {
        expect(isPassportUnstarted(passport({ declaredCountries: [{ code: 'PT' }] }))).toBe(true);
    });
});

describe('findPassportMoment', () => {
    const passport = {
        countries: [{ code: 'ES', isPrivate: false }, { code: 'FR', isPrivate: true }],
        achievements: [
            { id: 'explorer', isPrivate: false, earnedAt: '2026-09-01' },
            { id: 'van_log_1', isPrivate: true, earnedAt: '2026-09-02' },
            { id: 'adventurer', isPrivate: false, earnedAt: null },
        ],
    };

    it('finds a new country, with whether only the owner sees it', () => {
        expect(findPassportMoment(passport, { countryCode: 'FR' })).toEqual({ kind: 'country', code: 'FR', isPrivate: true });
    });

    it('finds an earned badge, with whether only the owner sees it', () => {
        expect(findPassportMoment(passport, { badgeId: 'van_log_1' })).toEqual({ kind: 'badge', code: 'van_log_1', isPrivate: true });
    });

    // A countries badge reached through van log countries: public family,
    // but locked for everyone else, so sharing it would reveal it.
    it("treats as private a badge others don't see as earned", () => {
        const withHidden = { ...passport, achievements: [{ id: 'countries_5', isPrivate: false, earnedAt: '2026-09-01', visibleToOthers: false }] };

        expect(findPassportMoment(withHidden, { badgeId: 'countries_5' })).toEqual({ kind: 'badge', code: 'countries_5', isPrivate: true });
    });

    // E.g. the entry behind it was deleted since the notification.
    it('finds nothing for a country or badge no longer in the passport', () => {
        expect(findPassportMoment(passport, { countryCode: 'JP' })).toBeNull();
        expect(findPassportMoment(passport, { badgeId: 'adventurer' })).toBeNull();
        expect(findPassportMoment(passport, {})).toBeNull();
    });
});

describe('describePassportMoment', () => {
    const t = (key) => key;

    it("shows a new country's flag and its name in the viewer language", () => {
        expect(describePassportMoment({ kind: 'country', code: 'IT' }, t, 'es'))
            .toEqual({ symbol: '🇮🇹', name: 'Italia', title: 'passport.momentCountryTitle' });
    });

    it("shows a new badge's emoji and name", () => {
        expect(describePassportMoment({ kind: 'badge', code: 'explorer' }, t, 'es'))
            .toEqual({ symbol: '🧭', name: 'badges.explorer.name', title: 'passport.momentBadgeTitle' });
    });
});
