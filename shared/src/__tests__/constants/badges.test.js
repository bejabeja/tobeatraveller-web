import { describe, expect, it } from 'vitest';
import { BADGES as API_BADGES } from '../../../../api/src/utils/badges.js';
import { BADGE_EMOJI, BADGE_FAMILY_ORDER, summarizePassport } from '../../utils/constants/badges.js';
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
