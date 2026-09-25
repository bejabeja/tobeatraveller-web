import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn() },
}));

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));

import client from '../../db/clientPostgres.js';
import { ItineraryRepository } from '../../repositories/itineraryRepository.js';

describe('ItineraryRepository cloned-from marker', () => {
    const repo = new ItineraryRepository();
    const trip = {
        userId: 'user-1', title: 'Trip', description: '', startDate: '2026-05-01', endDate: '2026-05-10',
        numberOfPeople: 2, category: 'culture', budget: 0, currency: 'EUR', photoUrl: '', photoPublicId: '',
        location: { name: 'Assisi', label: 'Assisi, UMB, Italy', lat: 43.07, lon: 12.61 },
    };

    beforeEach(() => {
        client.query.mockReset();
        client.query.mockResolvedValue({ rows: [{ id: 'mock-uuid', user_id: 'user-1', cloned_from_itinerary_id: 'original-1' }] });
    });

    it('stores which itinerary a clone was made from', async () => {
        await repo.create({ ...trip, clonedFromItineraryId: 'original-1' });

        const [query, params] = client.query.mock.calls[0];
        expect(query).toMatch(/cloned_from_itinerary_id/);
        expect(params).toContain('original-1');
    });

    it('stores no origin for a trip created from scratch', async () => {
        await repo.create(trip);

        const [query, params] = client.query.mock.calls[0];
        const columns = query.match(/INSERT INTO itineraries \(([^)]+)\)/)[1].split(',').map(column => column.trim());
        expect(params[columns.indexOf('cloned_from_itinerary_id')]).toBeNull();
    });

    it('saves the marker the service decided on update', async () => {
        await repo.update('mock-uuid', { ...trip, clonedFromItineraryId: null });

        const [query, params] = client.query.mock.calls[0];
        expect(query).toMatch(/cloned_from_itinerary_id = \$18/);
        expect(params[17]).toBeNull();
    });

    it('reads the marker back', async () => {
        const itinerary = await repo.create(trip);

        expect(itinerary.clonedFromItineraryId).toBe('original-1');
    });
});
