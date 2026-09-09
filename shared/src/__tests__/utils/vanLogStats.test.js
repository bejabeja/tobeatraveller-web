import { describe, expect, it } from 'vitest';
import { getVanLogFuelPriceTrend, groupVanLogEntriesByMonth } from '../../utils/vanLogStats.js';

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
