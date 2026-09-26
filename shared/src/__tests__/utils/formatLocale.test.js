import { describe, expect, it } from 'vitest';
import { formatAmount, formatCalendarDay, formatDate, formatNumber } from '../../utils/formatLocale.js';

// Intl separates currency and number with a no-break space.
const plain = (text) => text.replace(/ | /g, ' ');

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
