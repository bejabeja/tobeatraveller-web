import { describe, expect, it } from 'vitest';
import { toCalendarDay } from '../../utils/date.js';

describe('toCalendarDay()', () => {
    // How Postgres gives a DATE column: local midnight of that day.
    it('reads a date from the database as its own calendar day', () => {
        expect(toCalendarDay(new Date(2026, 4, 1))).toBe('2026-05-01');
    });

    // new Date('2026-05-01') is UTC midnight: west of Greenwich, the day before.
    it('keeps a calendar day sent as text as it is', () => {
        expect(toCalendarDay('2026-05-01')).toBe('2026-05-01');
        expect(toCalendarDay('2026-05-01T00:00:00.000Z')).toBe('2026-05-01');
    });

    it('is nothing without a date', () => {
        expect(toCalendarDay(null)).toBeNull();
        expect(toCalendarDay(undefined)).toBeNull();
    });
});
