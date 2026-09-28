import { describe, expect, it } from 'vitest';
import { experienceDates, isCalendarDay } from '../../utils/experienceDates.js';

describe('experienceDates', () => {
    it('ends an experience as many days after it starts as it lasts, counting both', () => {
        expect(experienceDates('2026-10-30', 5)).toEqual({ startDate: '2026-10-30', endDate: '2026-11-03', totalDays: 5 });
    });

    it('ends a one-day experience the day it starts', () => {
        expect(experienceDates('2026-03-29', 1).endDate).toBe('2026-03-29');
    });

    it('keeps only how long it lasts when there is no date yet', () => {
        expect(experienceDates(null, 7)).toEqual({ startDate: null, endDate: null, totalDays: 7 });
    });
});

describe('isCalendarDay', () => {
    it('accepts a real day and rejects anything else', () => {
        expect(isCalendarDay('2028-02-29')).toBe(true);
        expect(isCalendarDay('2026-02-30')).toBe(false);
        expect(isCalendarDay('30/10/2026')).toBe(false);
        expect(isCalendarDay('')).toBe(false);
        expect(isCalendarDay(null)).toBe(false);
    });
});
