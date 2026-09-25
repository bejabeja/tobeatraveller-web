import { describe, expect, it } from 'vitest';
import {
    isSameMoment,
    MAX_CELEBRATIONS_AT_ONCE,
    momentFromShareRequest,
    MAX_REMEMBERED_CELEBRATIONS,
    pickCelebrations,
    rememberCelebrations,
} from '../../utils/celebrations.js';
import { MOMENT_KINDS } from '../../utils/constants/badges.js';

const notification = (overrides) => ({
    id: 'n1', type: 'badge_earned', isRead: false, badgeId: 'countries_5', countryCode: null, ...overrides,
});

describe('pickCelebrations()', () => {
    it('celebrates an unread new badge as its passport moment', () => {
        expect(pickCelebrations([notification()], [])).toEqual([
            { notificationId: 'n1', moment: { kind: MOMENT_KINDS.BADGE, code: 'countries_5' } },
        ]);
    });

    it('celebrates an unread new country as its passport moment', () => {
        const stamp = notification({ type: 'country_stamp', badgeId: null, countryCode: 'PT' });

        expect(pickCelebrations([stamp], [])).toEqual([
            { notificationId: 'n1', moment: { kind: MOMENT_KINDS.COUNTRY, code: 'PT' } },
        ]);
    });

    it('ignores notifications that are not a new badge or country', () => {
        expect(pickCelebrations([notification({ type: 'like' }), notification({ type: 'recap_ready' })], [])).toEqual([]);
    });

    it('does not celebrate what the user already read', () => {
        expect(pickCelebrations([notification({ isRead: true })], [])).toEqual([]);
    });

    it('celebrates each notification only once on this device', () => {
        expect(pickCelebrations([notification()], ['n1'])).toEqual([]);
    });

    it('skips a badge notification without its badge, from before badges were stored on it', () => {
        expect(pickCelebrations([notification({ badgeId: null })], [])).toEqual([]);
    });

    // Opening the app after a long time shouldn't chain a dozen screens.
    it('celebrates at most a few at once, the oldest first, so the newest ends on screen', () => {
        const notifications = Array.from({ length: MAX_CELEBRATIONS_AT_ONCE + 2 }, (_, index) => notification({ id: `n${index}` }));

        const picked = pickCelebrations(notifications, []).map(celebration => celebration.notificationId);

        expect(picked).toHaveLength(MAX_CELEBRATIONS_AT_ONCE);
        expect(picked[picked.length - 1]).toBe('n0');
    });
});

describe('rememberCelebrations()', () => {
    it('adds the new ids to the ones already celebrated', () => {
        expect(rememberCelebrations(['a'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('does not repeat an id', () => {
        expect(rememberCelebrations(['a'], ['a'])).toEqual(['a']);
    });

    it('keeps only the most recent ids so storage does not grow forever', () => {
        const stored = Array.from({ length: MAX_REMEMBERED_CELEBRATIONS }, (_, index) => `old${index}`);

        const remembered = rememberCelebrations(stored, ['new']);

        expect(remembered).toHaveLength(MAX_REMEMBERED_CELEBRATIONS);
        expect(remembered).not.toContain('old0');
        expect(remembered[remembered.length - 1]).toBe('new');
    });

    it('treats a corrupted stored value as nothing celebrated yet', () => {
        expect(rememberCelebrations('not-a-list', ['a'])).toEqual(['a']);
    });
});

describe('momentFromShareRequest()', () => {
    it('reads the country whose card a notification opens', () => {
        expect(momentFromShareRequest({ share: 'moment', country: 'PT' })).toEqual({ kind: MOMENT_KINDS.COUNTRY, code: 'PT' });
    });

    it('reads the badge whose card a notification opens', () => {
        expect(momentFromShareRequest({ share: 'moment', badge: 'explorer' })).toEqual({ kind: MOMENT_KINDS.BADGE, code: 'explorer' });
    });

    it('is nothing when the request is not for a single moment', () => {
        expect(momentFromShareRequest({ share: 'countries', country: 'PT' })).toBeNull();
        expect(momentFromShareRequest({ share: 'moment' })).toBeNull();
        expect(momentFromShareRequest({})).toBeNull();
    });
});

describe('isSameMoment()', () => {
    it('matches the same kind and code only', () => {
        expect(isSameMoment({ kind: 'country', code: 'PT' }, { kind: 'country', code: 'PT' })).toBe(true);
        expect(isSameMoment({ kind: 'country', code: 'PT' }, { kind: 'country', code: 'ES' })).toBe(false);
        expect(isSameMoment({ kind: 'badge', code: 'PT' }, { kind: 'country', code: 'PT' })).toBe(false);
    });
});
