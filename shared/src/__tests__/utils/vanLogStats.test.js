import { describe, expect, it } from 'vitest';
import {
    getTripBudgetProgress, getVanLogDateRangePresets, getVanLogFuelPriceTrend, groupVanLogEntriesByMonth, groupVanLogEntriesByTrip,
} from '../../utils/vanLogStats.js';

describe('groupVanLogEntriesByMonth', () => {
    it('sums entries in the same month and currency into one total', () => {
        const groups = groupVanLogEntriesByMonth([
            { entryDate: '2026-03-05', amount: 10, currency: 'EUR' },
            { entryDate: '2026-03-12', amount: 5, currency: 'EUR' },
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0].total).toBe(15);
    });

    it('bails out to a null total once a month mixes currencies', () => {
        const groups = groupVanLogEntriesByMonth([
            { entryDate: '2026-03-05', amount: 10, currency: 'EUR' },
            { entryDate: '2026-03-12', amount: 5, currency: 'USD' },
        ]);

        expect(groups[0].total).toBeNull();
    });

    it('splits entries into separate groups by year and month', () => {
        const groups = groupVanLogEntriesByMonth([
            { entryDate: '2026-03-05', amount: 10, currency: 'EUR' },
            { entryDate: '2026-04-01', amount: 5, currency: 'EUR' },
        ]);

        expect(groups.map((g) => g.key)).toEqual(['2026-03', '2026-04']);
    });
});

describe('getVanLogFuelPriceTrend', () => {
    const fuelEntry = (entryDate, pricePerLiter, currency = 'EUR') => ({
        category: 'fuel', entryDate, pricePerLiter, currency,
    });

    it('returns null with fewer than 3 fuel fill-ups', () => {
        const trend = getVanLogFuelPriceTrend([fuelEntry('2026-03-01', 1.5), fuelEntry('2026-03-10', 1.6)]);
        expect(trend).toBeNull();
    });

    it('returns null when the fill-ups mix currencies', () => {
        const trend = getVanLogFuelPriceTrend([
            fuelEntry('2026-03-01', 1.5, 'EUR'),
            fuelEntry('2026-03-10', 1.6, 'EUR'),
            fuelEntry('2026-03-20', 1.7, 'USD'),
        ]);
        expect(trend).toBeNull();
    });

    it('sorts points oldest first and reports the max price', () => {
        const trend = getVanLogFuelPriceTrend([
            fuelEntry('2026-03-20', 1.7),
            fuelEntry('2026-03-01', 1.5),
            fuelEntry('2026-03-10', 1.6),
        ]);
        expect(trend.points.map((p) => p.entryDate)).toEqual(['2026-03-01', '2026-03-10', '2026-03-20']);
        expect(trend.maxPrice).toBe(1.7);
    });
});

describe('getTripBudgetProgress', () => {
    const trip = { budget: '500', currency: 'EUR' };

    it('compares what was spent in the trip currency against its budget', () => {
        const progress = getTripBudgetProgress(trip, [{ currency: 'EUR', total: 125 }]);

        expect(progress).toEqual({
            spent: 125, budget: 500, currency: 'EUR', isOver: false, overBy: 0, remaining: 375, fillPercent: 25,
        });
    });

    it('reports how much the budget is exceeded and caps the bar at 100%', () => {
        const progress = getTripBudgetProgress(trip, [{ currency: 'EUR', total: 620 }]);

        expect(progress.isOver).toBe(true);
        expect(progress.overBy).toBe(120);
        expect(progress.remaining).toBe(0);
        expect(progress.fillPercent).toBe(100);
    });

    it('is not over budget when spend equals the budget exactly', () => {
        const progress = getTripBudgetProgress(trip, [{ currency: 'EUR', total: 500 }]);

        expect(progress.isOver).toBe(false);
        expect(progress.overBy).toBe(0);
        expect(progress.remaining).toBe(0);
    });

    it('shows zero spent when nothing has been logged at all yet', () => {
        const progress = getTripBudgetProgress(trip, []);

        expect(progress.spent).toBe(0);
        expect(progress.fillPercent).toBe(0);
    });

    it('returns null when spend is logged only in another currency, instead of a misleading zero', () => {
        expect(getTripBudgetProgress(trip, [{ currency: 'USD', total: 80 }])).toBeNull();
    });

    it('ignores spend in other currencies when the trip currency also has some', () => {
        const progress = getTripBudgetProgress(trip, [{ currency: 'USD', total: 80 }, { currency: 'EUR', total: 50 }]);

        expect(progress.spent).toBe(50);
    });

    it.each([
        ['no trip', null],
        ['no budget', { budget: null, currency: 'EUR' }],
        ['a zero budget', { budget: '0', currency: 'EUR' }],
        ['a non numeric budget', { budget: 'abc', currency: 'EUR' }],
    ])('returns null for %s', (_label, tripCase) => {
        expect(getTripBudgetProgress(tripCase, [{ currency: 'EUR', total: 10 }])).toBeNull();
    });
});

describe('getVanLogDateRangePresets', () => {
    const rangeOf = (presets, key) => {
        const { dateFrom, dateTo } = presets.find((preset) => preset.key === key);
        return [dateFrom, dateTo];
    };
    const presets = getVanLogDateRangePresets(new Date(2026, 8, 29, 23, 30));

    it('makes today a one day range', () => {
        expect(rangeOf(presets, 'today')).toEqual(['2026-09-29', '2026-09-29']);
    });

    it('counts today as one of the last 7 days', () => {
        expect(rangeOf(presets, 'last7')).toEqual(['2026-09-23', '2026-09-29']);
    });

    it('counts today as one of the last 30 days, crossing into the previous month', () => {
        expect(rangeOf(presets, 'last30')).toEqual(['2026-08-31', '2026-09-29']);
    });

    it('starts this month on its first day', () => {
        expect(rangeOf(presets, 'thisMonth')).toEqual(['2026-09-01', '2026-09-29']);
    });

    it('uses the local calendar day late at night instead of the UTC one', () => {
        const lateLocalNight = getVanLogDateRangePresets(new Date(2026, 0, 1, 23, 59));

        expect(rangeOf(lateLocalNight, 'today')).toEqual(['2026-01-01', '2026-01-01']);
    });

    it('crosses a year boundary for the last 7 days', () => {
        const newYear = getVanLogDateRangePresets(new Date(2026, 0, 3));

        expect(rangeOf(newYear, 'last7')).toEqual(['2025-12-28', '2026-01-03']);
    });
});

describe('groupVanLogEntriesByTrip', () => {
    const portugal = { id: 'trip-pt', title: 'Portugal' };
    const alps = { id: 'trip-alps', title: 'Alps' };

    it('sums each trip\'s expenses into its own total', () => {
        const groups = groupVanLogEntriesByTrip([
            { id: 'a', itinerary: portugal, amount: 10, currency: 'EUR' },
            { id: 'b', itinerary: alps, amount: 7, currency: 'EUR' },
            { id: 'c', itinerary: portugal, amount: 5, currency: 'EUR' },
        ]);

        expect(groups.map((group) => [group.title, group.total])).toEqual([['Portugal', 15], ['Alps', 7]]);
        expect(groups[0].entries.map((entry) => entry.id)).toEqual(['a', 'c']);
    });

    it('orders trips by their most recent expense, following the order of the entries', () => {
        const groups = groupVanLogEntriesByTrip([
            { id: 'newest', itinerary: alps, amount: 1, currency: 'EUR' },
            { id: 'older', itinerary: portugal, amount: 1, currency: 'EUR' },
        ]);

        expect(groups.map((group) => group.tripId)).toEqual(['trip-alps', 'trip-pt']);
    });

    it('puts expenses without a trip in a last group with no trip id, even when they are the newest', () => {
        const groups = groupVanLogEntriesByTrip([
            { id: 'loose', itinerary: null, amount: 3, currency: 'EUR' },
            { id: 'linked', itinerary: portugal, amount: 4, currency: 'EUR' },
        ]);

        expect(groups.map((group) => group.tripId)).toEqual(['trip-pt', null]);
        expect(groups[1].title).toBeNull();
        expect(groups[1].total).toBe(3);
    });

    it('leaves the total null for a trip whose expenses are in different currencies', () => {
        const groups = groupVanLogEntriesByTrip([
            { id: 'a', itinerary: portugal, amount: 10, currency: 'EUR' },
            { id: 'b', itinerary: portugal, amount: 5, currency: 'USD' },
        ]);

        expect(groups[0].total).toBeNull();
    });

    it('keeps entries without an amount in the group without changing its total', () => {
        const groups = groupVanLogEntriesByTrip([
            { id: 'a', itinerary: portugal, amount: 10, currency: 'EUR' },
            { id: 'b', itinerary: portugal, amount: null, currency: null },
        ]);

        expect(groups[0].entries).toHaveLength(2);
        expect(groups[0].total).toBe(10);
    });

    it('returns no groups for no entries', () => {
        expect(groupVanLogEntriesByTrip([])).toEqual([]);
    });
});
