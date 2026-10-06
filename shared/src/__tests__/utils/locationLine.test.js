import { describe, expect, it } from 'vitest';
import { locationLine } from '../../utils/locationLine.js';

describe('locationLine', () => {
    it('joins the place and its country', () => {
        expect(locationLine({ name: 'Faro', country: 'Portugal' })).toBe('Faro, Portugal');
    });

    it('shows only the name when there is no country', () => {
        expect(locationLine({ name: 'Faro' })).toBe('Faro');
    });

    // Regression: a place that is the country itself showed as "France, France".
    it('does not repeat the country when the place is the country itself', () => {
        expect(locationLine({ name: 'France', country: 'France' })).toBe('France');
        expect(locationLine({ name: 'france ', country: 'France' })).toBe('france ');
    });

    it('returns null when there is no place', () => {
        expect(locationLine({ country: 'France' })).toBeNull();
        expect(locationLine()).toBeNull();
        expect(locationLine(null)).toBeNull();
    });
});
