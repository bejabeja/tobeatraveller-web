import { describe, expect, it } from 'vitest';
import { currentMonthRange, summarizeVanToday } from '../../utils/vanToday.js';

describe('currentMonthRange', () => {
    it('goes from the first of the month to today', () => {
        expect(currentMonthRange(new Date(2026, 9, 15, 10, 30))).toEqual({ dateFrom: '2026-10-01', dateTo: '2026-10-15' });
    });

    it('is just today on the first day of the month', () => {
        expect(currentMonthRange(new Date(2026, 9, 1, 8, 0))).toEqual({ dateFrom: '2026-10-01', dateTo: '2026-10-01' });
    });

    it('keeps the month on its last day, late at night', () => {
        expect(currentMonthRange(new Date(2026, 9, 31, 23, 59))).toEqual({ dateFrom: '2026-10-01', dateTo: '2026-10-31' });
    });

    it('works in December, and for months with one digit', () => {
        expect(currentMonthRange(new Date(2026, 11, 24))).toEqual({ dateFrom: '2026-12-01', dateTo: '2026-12-24' });
        expect(currentMonthRange(new Date(2027, 1, 3))).toEqual({ dateFrom: '2027-02-01', dateTo: '2027-02-03' });
    });
});

describe('summarizeVanToday', () => {
    it('takes the totals of the month and counts what is left to buy', () => {
        const summary = summarizeVanToday({
            stats: { totalsByCurrency: [{ currency: 'EUR', total: 412.3 }] },
            shoppingList: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        });

        expect(summary).toEqual({ monthTotals: [{ currency: 'EUR', total: 412.3 }], shoppingCount: 3 });
    });

    // Regression-in-waiting: "nothing spent" and "could not load" are different answers.
    it('tells nothing spent (an empty list) apart from not knowing (null)', () => {
        expect(summarizeVanToday({ stats: { totalsByCurrency: [] }, shoppingList: [] })).toEqual({ monthTotals: [], shoppingCount: 0 });
        expect(summarizeVanToday({ stats: null, shoppingList: null })).toEqual({ monthTotals: null, shoppingCount: null });
        expect(summarizeVanToday({})).toEqual({ monthTotals: null, shoppingCount: null });
    });

    it('does not lose one answer because the other failed', () => {
        expect(summarizeVanToday({ stats: { totalsByCurrency: [{ currency: 'EUR', total: 5 }] }, shoppingList: undefined }))
            .toEqual({ monthTotals: [{ currency: 'EUR', total: 5 }], shoppingCount: null });
        expect(summarizeVanToday({ stats: undefined, shoppingList: [{ id: 'a' }] })).toEqual({ monthTotals: null, shoppingCount: 1 });
    });
});
