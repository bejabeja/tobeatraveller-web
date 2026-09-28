import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn() },
}));

import client from '../../db/clientPostgres.js';
import { PackingListRepository } from '../../repositories/packingListRepository.js';

describe('PackingListRepository.findTripsToRemind()', () => {
    const repo = new PackingListRepository();

    beforeEach(() => {
        client.query.mockReset();
    });

    it('finds the trips starting that day', async () => {
        client.query.mockResolvedValue({ rows: [] });

        await repo.findTripsToRemind('2026-09-30');

        const [query, params] = client.query.mock.calls[0];
        expect(query).toMatch(/WHERE trips\.start_date = \$1\s+GROUP BY/);
        expect(params).toEqual(['2026-09-30']);
    });

    it('returns whose trip it is and how much is left as a number', async () => {
        client.query.mockResolvedValue({ rows: [{ user_id: 'u1', itinerary_id: 't1', remaining_count: '8' }] });

        expect(await repo.findTripsToRemind('2026-09-30')).toEqual([{ userId: 'u1', itineraryId: 't1', remainingCount: 8 }]);
    });
});
