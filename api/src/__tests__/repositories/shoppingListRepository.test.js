import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn() },
}));

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));

import client from '../../db/clientPostgres.js';
import { ShoppingListRepository } from '../../repositories/shoppingListRepository.js';

describe('ShoppingListRepository', () => {
    const repo = new ShoppingListRepository();

    beforeEach(() => {
        client.query.mockReset();
    });

    it('matches an existing item case-insensitively by name, and exactly by unit', async () => {
        client.query.mockResolvedValue({ rows: [] });

        await repo.findByNameAndUnit('user-1', 'Manzanas', 'units');

        const [queryText, params] = client.query.mock.calls[0];
        expect(queryText).toMatch(/LOWER\(name\) = LOWER\(\$2\)/);
        expect(queryText).toMatch(/unit = \$3/);
        expect(params).toEqual(['user-1', 'Manzanas', 'units']);
    });

    it('returns null when no matching item is found', async () => {
        client.query.mockResolvedValue({ rows: [] });

        const result = await repo.findByNameAndUnit('user-1', 'Manzanas', 'units');

        expect(result).toBeNull();
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
