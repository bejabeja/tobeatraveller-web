import { describe, expect, it } from 'vitest';
import { BADGES as API_BADGES } from '../../../../api/src/utils/badges.js';
import { ISO_COUNTRY_CODES } from '../../../../api/src/utils/countryCodes.js';
import {
    BADGE_EMOJI, BADGE_FAMILY_ORDER, PASSPORT_SHARE_LIMITS, passportShareFlagLayout, passportUrl, summarizePassport,
    passportSharePath, signupUrlFromPassport, summarizePassportForSharing,
} from '../../utils/constants/badges.js';
import en from '../../locales/en.json';
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

    it('makes room for the achievements when they are included', () => {
        const summary = summarizePassportForSharing(
            passport({ countries: codes(30), achievements: [stamp('explorer', 'trips')] }),
            { includeAchievements: true },
        );

        expect(summary.showAchievements).toBe(true);
        expect(summary.flagCodes).toHaveLength(PASSPORT_SHARE_LIMITS.flagsWithAchievements);
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
    // The countries panel alone is 1250px tall, 1140px under its title, and a
    // "+N" line takes 80px more.
    const COUNTRIES_ALONE_CONTENT_HEIGHT = 1140;
    const MORE_LABEL_HEIGHT = 80;

    it('gives a few countries fewer, bigger flags per row', () => {
        const few = passportShareFlagLayout(3, false);
        const many = passportShareFlagLayout(25, false);

        expect(few.perRow).toBeLessThan(many.perRow);
        expect(few.fontSize).toBeGreaterThan(many.fontSize);
    });

    it.each([1, 4, 5, 9, 10, 16, 17, 25])('fits %i flags, plus the "+N" line, in the countries panel alone', (count) => {
        const { perRow, cellHeight } = passportShareFlagLayout(count, false);
        const rows = Math.ceil(count / perRow);

        expect(rows * cellHeight + MORE_LABEL_HEIGHT).toBeLessThanOrEqual(COUNTRIES_ALONE_CONTENT_HEIGHT);
    });

    it('keeps the smaller layout when the achievements share the card', () => {
        expect(passportShareFlagLayout(3, true)).toEqual({ perRow: 5, fontSize: 110, cellHeight: 160 });
    });
});
