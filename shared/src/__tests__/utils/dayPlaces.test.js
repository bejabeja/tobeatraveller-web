import { describe, expect, it } from 'vitest';
import { dayPlacesPreview, daysToFold, FOLD_DAYS_FROM_PLACES } from '../../utils/dayPlaces.js';

describe('dayPlacesPreview', () => {
    it('shows the first three names and counts the rest', () => {
        expect(dayPlacesPreview(['Sagrada Família', 'Park Güell', 'Montjuïc', 'Born', 'Barceloneta']))
            .toEqual({ names: ['Sagrada Família', 'Park Güell', 'Montjuïc'], moreCount: 2 });
    });

    it('skips places not named yet, but still counts them', () => {
        expect(dayPlacesPreview(['', 'Park Güell', undefined, '  ']))
            .toEqual({ names: ['Park Güell'], moreCount: 3 });
    });

    it('has nothing to show for a day without places', () => {
        expect(dayPlacesPreview([])).toEqual({ names: [], moreCount: 0 });
    });
});

describe('daysToFold', () => {
    it('folds every day but the first once the trip has enough places', () => {
        expect(daysToFold([1, 2, 3], FOLD_DAYS_FROM_PLACES)).toEqual([2, 3]);
    });

    it('folds nothing on a short trip', () => {
        expect(daysToFold([1, 2, 3], FOLD_DAYS_FROM_PLACES - 1)).toEqual([]);
    });

    it('never folds a single day', () => {
        expect(daysToFold([1], 20)).toEqual([]);
    });
});
