import { describe, expect, it } from 'vitest';
import { filterItineraries } from '../../utils/filterItineraries.js';

const makeItinerary = (overrides = {}) => ({
    id: '1',
    category: 'adventure',
    budget: '1000',
    location: { name: 'Bali' },
    title: 'Volcano trek',
    description: 'Hiking around active volcanoes',
    tripTotalDays: 7,
    startDate: '2025-06-01',
    currency: 'USD',
    numberOfPeople: 1,
    isPublic: true,
    ...overrides,
});

describe('filterItineraries', () => {
    it('returns an empty array for non-array input', () => {
        expect(filterItineraries(null, {})).toEqual([]);
        expect(filterItineraries(undefined, {})).toEqual([]);
    });

    it('matches query against the destination name', () => {
        const itineraries = [makeItinerary({ location: { name: 'Bali' } })];
        expect(filterItineraries(itineraries, { query: 'bali' })).toHaveLength(1);
    });

    it('matches query against the title when the destination does not match', () => {
        const itineraries = [makeItinerary({ location: { name: 'Tokyo' }, title: 'Volcano trek' })];
        expect(filterItineraries(itineraries, { query: 'volcano' })).toHaveLength(1);
    });

    it('matches query against the description when destination and title do not match', () => {
        const itineraries = [makeItinerary({
            location: { name: 'Tokyo' }, title: 'City break', description: 'Exploring active volcanoes',
        })];
        expect(filterItineraries(itineraries, { query: 'volcano' })).toHaveLength(1);
    });

    it('excludes itineraries matching none of destination/title/description', () => {
        const itineraries = [makeItinerary({
            location: { name: 'Tokyo' }, title: 'City break', description: 'Sushi and temples',
        })];
        expect(filterItineraries(itineraries, { query: 'volcano' })).toHaveLength(0);
    });

    it('keeps the older destination-only filter working independently of query', () => {
        const itineraries = [makeItinerary({ location: { name: 'Bali' } })];
        expect(filterItineraries(itineraries, { destination: 'bali' })).toHaveLength(1);
        expect(filterItineraries(itineraries, { destination: 'tokyo' })).toHaveLength(0);
    });

    // new Date(null) is 1970: an undated experience used to pass any "until" date.
    it('leaves out an experience without a date when filtering by start date', () => {
        const undated = makeItinerary({ startDate: null });

        expect(filterItineraries([undated], { startDateMax: '2026-12-31' })).toHaveLength(0);
        expect(filterItineraries([undated], {})).toHaveLength(1);
    });
});
