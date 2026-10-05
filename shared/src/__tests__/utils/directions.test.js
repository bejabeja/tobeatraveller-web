import { describe, expect, it } from 'vitest';
import { placeDirectionsUrl } from '../../utils/directions.js';

describe('place directions link', () => {
    it('points the maps app at the place coordinates', () => {
        expect(placeDirectionsUrl({ latitude: '41.3851', longitude: '2.1734' }))
            .toBe('https://www.google.com/maps/dir/?api=1&destination=41.3851,2.1734');
    });

    it('accepts coordinates stored as numbers, including negative ones', () => {
        expect(placeDirectionsUrl({ latitude: -33.8688, longitude: 151.2093 }))
            .toBe('https://www.google.com/maps/dir/?api=1&destination=-33.8688,151.2093');
    });

    it('has no link for a place without coordinates', () => {
        expect(placeDirectionsUrl({ name: 'Somewhere' })).toBeNull();
        expect(placeDirectionsUrl({ latitude: '', longitude: '' })).toBeNull();
        expect(placeDirectionsUrl({ latitude: 'abc', longitude: '2' })).toBeNull();
    });

    it('keeps a place on the equator or the meridian', () => {
        expect(placeDirectionsUrl({ latitude: 0, longitude: 0 }))
            .toBe('https://www.google.com/maps/dir/?api=1&destination=0,0');
    });
});
