import { describe, expect, it } from 'vitest';
import { formatAmount, formatBudgetAmount, formatCalendarDay, formatDate, formatNumber, formatTripDates } from '../../utils/formatLocale.js';

// Intl separates currency and number with a no-break space.
const plain = (text) => text.replace(/[\u00a0\u202f\u2009]/g, ' ');

describe('formatAmount', () => {
    it('writes an amount the way the app language does, not the browser', () => {
        expect(plain(formatAmount(1019, 'EUR', 'es'))).toBe('1019,00 €');
        expect(formatAmount(1019, 'EUR', 'en')).toBe('€1,019.00');
    });

    // Currencies are typed in by hand on expenses.
    it('keeps a currency Intl does not know after the number', () => {
        expect(formatAmount(12.5, 'XYZ1', 'es')).toBe('12,50 XYZ1');
        expect(formatAmount(12.5, '', 'en')).toBe('12.50');
    });
});

describe('formatNumber', () => {
    it('uses the language separators', () => {
        expect(formatNumber(1500.5, 'de', { maximumFractionDigits: 2 })).toBe('1.500,5');
    });
});

describe('formatCalendarDay', () => {
    // Regression guard: read as a date-time, "2026-09-10" is the 9th west of UTC.
    it('shows the stored day itself, in the app language', () => {
        expect(formatCalendarDay('2026-09-10', 'es', { month: 'long', day: 'numeric' })).toBe('10 de septiembre');
        expect(formatCalendarDay('2026-09-01', 'en', { year: 'numeric', month: 'long' })).toBe('September 2026');
    });
});

describe('formatDate', () => {
    it('names the month in the app language', () => {
        expect(formatDate('2026-05-15T12:00:00Z', 'fr', { year: 'numeric', month: 'long' })).toBe('mai 2026');
    });
});

// Regression: a trip's budget read "500 · €250/pers.": the total without its
// currency and the share per person with it in front, whatever the language.
describe('formatBudgetAmount()', () => {
    it('writes a round budget without decimals, the currency where the language puts it', () => {
        expect(plain(formatBudgetAmount(500, 'EUR', 'es'))).toBe('500 €');
        expect(formatBudgetAmount(500, 'EUR', 'en')).toBe('€500');
    });

    it('writes cents as money does, with two digits', () => {
        expect(plain(formatBudgetAmount(249.5, 'EUR', 'es'))).toBe('249,50 €');
    });
});

// Regression: the dates came from the API written in English for everyone.
describe('formatTripDates', () => {
    it('writes a trip within one month in the viewer\'s language', () => {
        expect(plain(formatTripDates('2026-10-02', '2026-10-04', 'es'))).toBe('2–4 oct 2026');
        expect(plain(formatTripDates('2026-10-02', '2026-10-04', 'en'))).toBe('Oct 2 – 4, 2026');
    });

    it('names both months when the trip spans two', () => {
        expect(plain(formatTripDates('2026-09-28', '2026-10-03', 'es'))).toBe('28 sept – 3 oct 2026');
    });

    it('writes both ends in full where a range can\'t be formatted', () => {
        const formatRange = Intl.DateTimeFormat.prototype.formatRange;
        delete Intl.DateTimeFormat.prototype.formatRange;
        try {
            expect(plain(formatTripDates('2026-10-02', '2026-10-04', 'es'))).toBe('2 oct – 4 oct 2026');
        } finally {
            Intl.DateTimeFormat.prototype.formatRange = formatRange;
        }
    });
});

