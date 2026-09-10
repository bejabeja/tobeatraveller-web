import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn() },
}));

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));

import client from '../../db/clientPostgres.js';
import { InventoryRepository } from '../../repositories/inventoryRepository.js';

describe('InventoryRepository', () => {
    const repo = new InventoryRepository();

    beforeEach(() => {
        client.query.mockReset();
    });

    it('matches an existing item case-insensitively by name, and exactly by unit', async () => {
        client.query.mockResolvedValue({ rows: [] });

        await repo.findByNameAndUnit('user-1', 'Pasta', 'g');

        const [queryText, params] = client.query.mock.calls[0];
        expect(queryText).toMatch(/LOWER\(name\) = LOWER\(\$2\)/);
        expect(queryText).toMatch(/unit = \$3/);
        expect(params).toEqual(['user-1', 'Pasta', 'g']);
    });

    it('returns null when no matching item is found', async () => {
        client.query.mockResolvedValue({ rows: [] });

        const result = await repo.findByNameAndUnit('user-1', 'Pasta', 'g');

        expect(result).toBeNull();
    });

    it('returns the matching item with a numeric amount', async () => {
        client.query.mockResolvedValue({
            rows: [{ id: 'inv-1', user_id: 'user-1', name: 'Pasta', category: 'food', amount: '100.00', unit: 'g', notes: null }],
        });

        const result = await repo.findByNameAndUnit('user-1', 'Pasta', 'g');

        expect(result.amount).toBe(100);
        expect(typeof result.amount).toBe('number');
    });

    it('counts how many items belong to the given user', async () => {
        client.query.mockResolvedValue({ rows: [{ count: 5 }] });

        const count = await repo.countByUserId('user-1');

        expect(count).toBe(5);
        const [queryText, params] = client.query.mock.calls[0];
        expect(queryText).toMatch(/COUNT\(\*\)/);
        expect(queryText).toMatch(/WHERE user_id = \$1/);
        expect(params).toEqual(['user-1']);
    });
});
