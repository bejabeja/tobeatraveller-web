import { describe, it, expect, vi } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn() },
}));

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));

import client from '../../db/clientPostgres.js';
import { PlacesRepository } from '../../repositories/placesRepository.js';

const row = { id: 'place-1', title: 'Fushimi Inari', label: 'Fushimi Inari', latitude: 34.9, longitude: 135.7, category: 'monument' };

describe('PlacesRepository dayNumber propagation', () => {
    const repo = new PlacesRepository();

    it('insertPlace reports the place dayNumber, not the default', async () => {
        client.query.mockResolvedValue({ rows: [row] });

        const place = await repo.insertPlace({
            infoPlace: { name: 'Fushimi Inari', lat: 34.9, lon: 135.7 },
            category: 'monument',
            orderIndex: 0,
            dayNumber: 3,
            description: 'desc',
        });

        expect(place.dayNumber).toBe(3);
    });

    it('updatePlace reports the place dayNumber, not the default', async () => {
        client.query.mockResolvedValue({ rows: [row] });

        const place = await repo.updatePlace({
            id: 'place-1',
            infoPlace: { name: 'Fushimi Inari', lat: 34.9, lon: 135.7 },
            category: 'monument',
            orderIndex: 0,
            dayNumber: 2,
            description: 'desc',
        });

        expect(place.dayNumber).toBe(2);
    });
});

describe('PlacesRepository.getPlacesInBounds()', () => {
    const repo = new PlacesRepository();

    it('queries with the bounds in minLat, maxLat, minLon, maxLon order', async () => {
        client.query.mockResolvedValue({ rows: [] });

        await repo.getPlacesInBounds({ minLat: 40, maxLat: 41, minLon: -1, maxLon: 1 });

        const [, params] = client.query.mock.calls.at(-1);
        expect(params).toEqual([40, 41, -1, 1]);
    });

    it('maps sample itinerary columns to camelCase', async () => {
        client.query.mockResolvedValue({
            rows: [{
                id: 'place-1', title: 'Fushimi Inari', label: 'Fushimi Inari, Kyoto',
                category: 'monument', lat: 34.9, lon: 135.7, count: 2,
                sample_itinerary_id: 'itin-1', sample_itinerary_title: 'Japan trip', sample_photo_url: 'https://example.com/p.jpg',
            }],
        });

        const [place] = await repo.getPlacesInBounds({ minLat: 0, maxLat: 90, minLon: 0, maxLon: 180 });

        expect(place).toEqual({
            id: 'place-1', name: 'Fushimi Inari', label: 'Fushimi Inari, Kyoto',
            category: 'monument', lat: 34.9, lon: 135.7, count: 2,
            sampleItineraryId: 'itin-1', sampleItineraryTitle: 'Japan trip', samplePhotoUrl: 'https://example.com/p.jpg',
        });
    });
});
