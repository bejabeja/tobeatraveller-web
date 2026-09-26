import { describe, expect, it } from 'vitest';
import { formatTimeAgo, timeAgo } from '../../utils/timeAgo.js';

const NOW = new Date('2026-09-26T12:00:00Z');
const before = (seconds) => new Date(NOW.getTime() - seconds * 1000).toISOString();

describe('timeAgo', () => {
    it.each([
        [30, 'time.justNow', 0],
        [5 * 60, 'time.minutesAgo', 5],
        [3 * 3600, 'time.hoursAgo', 3],
        [2 * 24 * 3600, 'time.daysAgo', 2],
        [65 * 24 * 3600, 'time.monthsAgo', 2],
        [400 * 24 * 3600, 'time.yearsAgo', 1],
    ])('says %i seconds ago as %s (%i)', (seconds, key, count) => {
        expect(timeAgo(before(seconds), NOW)).toEqual({ key, count });
    });

    // A clock slightly ahead on the server shouldn't read "in the future".
    it('treats a moment just after now as just now', () => {
        expect(timeAgo(new Date(NOW.getTime() + 5000), NOW)).toEqual({ key: 'time.justNow', count: 0 });
    });
});

describe('formatTimeAgo', () => {
    it('writes it with the given translate function', () => {
        const t = (key, { count }) => `${key}:${count}`;

        expect(formatTimeAgo(t, before(3 * 3600), NOW)).toBe('time.hoursAgo:3');
    });
});
