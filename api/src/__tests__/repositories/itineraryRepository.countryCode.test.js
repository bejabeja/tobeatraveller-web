import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn() },
}));

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));

import client from '../../db/clientPostgres.js';
import { ItineraryRepository } from '../../repositories/itineraryRepository.js';

describe('ItineraryRepository country code', () => {
    const repo = new ItineraryRepository();
    const trip = {
        userId: 'user-1', title: 'Trip', description: '', startDate: '2026-05-01', endDate: '2026-05-10',
        numberOfPeople: 2, category: 'culture', budget: 0, currency: 'EUR', photoUrl: '', photoPublicId: '',
        location: { name: 'Assisi', label: 'Assisi, UMB, Italy', lat: 43.07, lon: 12.61 },
    };

    beforeEach(() => {
        client.query.mockReset();
        client.query.mockResolvedValue({ rows: [{ id: 'mock-uuid', user_id: 'user-1' }] });
    });

    // A trip only has Geoapify's label, whose last part is the country.
    it('stores the ISO code taken from the end of the label on create', async () => {
        await repo.create(trip);

        const [query, params] = client.query.mock.calls[0];
        expect(query).toMatch(/location_country_code/);
        expect(params.at(-1)).toBe('IT');
    });

    it('updates the ISO code when the destination changes', async () => {
        await repo.update('mock-uuid', { ...trip, location: { ...trip.location, label: 'Lisbon, Portugal' } });

        const [query, params] = client.query.mock.calls[0];
        expect(query).toMatch(/location_country_code = \$17/);
        expect(params[16]).toBe('PT');
    });
});
