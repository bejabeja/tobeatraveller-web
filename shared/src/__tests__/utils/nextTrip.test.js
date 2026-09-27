import { describe, expect, it } from 'vitest';
import { findNextTrip, localCalendarDay } from '../../utils/nextTrip.js';

const trip = (id, startDate, endDate) => ({ id, startDate, endDate });

describe('findNextTrip', () => {
    it('finds the trip under way today and which day of it this is', () => {
        const next = findNextTrip([trip('lisbon', '2026-10-10', '2026-10-15'), trip('norway', '2026-09-25', '2026-10-01')], '2026-09-27');

        expect(next).toEqual({ itinerary: trip('norway', '2026-09-25', '2026-10-01'), isOngoing: true, dayOfTrip: 3, totalDays: 7 });
    });

    it('otherwise finds the soonest trip to start and how many days are left', () => {
        const next = findNextTrip([trip('lisbon', '2026-10-10', '2026-10-15'), trip('rome', '2026-09-30', '2026-10-02')], '2026-09-27');

        expect(next).toEqual({ itinerary: trip('rome', '2026-09-30', '2026-10-02'), isOngoing: false, daysUntil: 3 });
    });

    it('counts a trip that starts or ends today as under way', () => {
        expect(findNextTrip([trip('a', '2026-09-27', '2026-09-30')], '2026-09-27')).toMatchObject({ isOngoing: true, dayOfTrip: 1 });
        expect(findNextTrip([trip('b', '2026-09-20', '2026-09-27')], '2026-09-27')).toMatchObject({ isOngoing: true, dayOfTrip: 8 });
    });

    // Regression: an experience is dated from the day it was saved, so one
    // made today showed as a trip under way.
    it('leaves out experiences, whose dates are not when the trip happens', () => {
        const experience = { ...trip('lisbon', '2026-09-27', '2026-09-30'), source: 'experience' };

        expect(findNextTrip([experience], '2026-09-27')).toBeNull();
    });

    it('has nothing when every trip is over', () => {
        expect(findNextTrip([trip('a', '2026-08-01', '2026-08-05')], '2026-09-27')).toBeNull();
        expect(findNextTrip([], '2026-09-27')).toBeNull();
        expect(findNextTrip(null, '2026-09-27')).toBeNull();
    });

    it('counts whole days across a change of clocks', () => {
        expect(findNextTrip([trip('a', '2026-10-26', '2026-10-28')], '2026-10-24')).toMatchObject({ daysUntil: 2 });
    });
});

describe('localCalendarDay', () => {
    it('writes the local date as a calendar day', () => {
        expect(localCalendarDay(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    });
});
