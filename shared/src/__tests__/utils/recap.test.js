import { describe, expect, it } from 'vitest';
import { recapSlides, recapYear, summarizeRecapForSharing } from '../../utils/recap.js';

const at = (isoDate) => new Date(`${isoDate}T12:00:00Z`);

const recap = (overrides = {}) => ({
    year: 2026,
    hasActivity: true,
    countries: { codes: ['PT', 'ES'], newCodes: ['PT'], top: { code: 'PT', days: 20 } },
    daysOnRoad: 87,
    trips: { count: 2, longest: { title: 'Portugal', days: 21 } },
    vanLog: { entries: 40, nights: 25, refuels: 9, liters: 413 },
    diary: { entries: 15, wouldReturn: 11 },
    badges: ['countries_1'],
    ...overrides,
});

describe('recapYear', () => {
    it.each([['2026-12-01', 2026], ['2027-01-31', 2026]])('on %s is the recap of %i', (date, year) => {
        expect(recapYear(at(date))).toBe(year);
    });

    it.each(['2026-11-30', '2027-02-01'])('is out of season on %s', (date) => {
        expect(recapYear(at(date))).toBeNull();
    });
});

describe('recapSlides', () => {
    it('has a slide for each part of the year with something in it, between the cover and sharing', () => {
        expect(recapSlides(recap())).toEqual(['cover', 'countries', 'days', 'trips', 'van', 'diary', 'badges', 'share']);
    });

    it('skips the parts with nothing in them', () => {
        const slides = recapSlides(recap({
            trips: { count: 0, longest: null },
            diary: { entries: 0, wouldReturn: 0 },
            badges: [],
        }));

        expect(slides).toEqual(['cover', 'countries', 'days', 'van', 'share']);
    });

    it('has only the empty slide for a year with nothing logged', () => {
        expect(recapSlides(recap({ hasActivity: false }))).toEqual(['empty']);
    });
});

describe('summarizeRecapForSharing', () => {
    it('keeps figures only, never text from the recap', () => {
        const summary = summarizeRecapForSharing(recap(), 'jane');

        expect(summary).toEqual({
            username: 'jane', year: 2026, countryCount: 2, newCountryCount: 1, flagCodes: ['PT', 'ES'],
            hiddenCountries: 0, daysOnRoad: 87, nights: 25, stamps: 1,
        });
        expect(JSON.stringify(summary)).not.toContain('Portugal');
    });
});
