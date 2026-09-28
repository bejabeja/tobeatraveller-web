import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn() },
}));

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));

import client from '../../db/clientPostgres.js';
import { PackingChecklistRepository } from '../../repositories/packingChecklistRepository.js';

describe('PackingChecklistRepository', () => {
    const repo = new PackingChecklistRepository();

    beforeEach(() => {
        client.query.mockReset();
    });

    describe('createMany()', () => {
        it('inserts every item in a single query instead of one round trip per item', async () => {
            client.query.mockResolvedValue({
                rows: [
                    { id: 'a', user_id: 'user-1', category: 'clothing', name: 'Jacket', checked: false },
                    { id: 'b', user_id: 'user-1', category: 'clothing', name: 'Boots', checked: false },
                ],
            });

            const result = await repo.createMany('user-1', 'list-1', [
                { category: 'clothing', name: 'Jacket' },
                { category: 'clothing', name: 'Boots' },
            ]);

            expect(client.query).toHaveBeenCalledTimes(1);
            const [queryText, params] = client.query.mock.calls[0];
            expect(queryText).toMatch(/VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7\), \(\$8, \$9, \$10, \$11, \$12, \$13, \$14\)/);
            expect(params).toEqual(['mock-uuid', 'user-1', 'list-1', 'clothing', 'Jacket', null, 1, 'mock-uuid', 'user-1', 'list-1', 'clothing', 'Boots', null, 2]);
            expect(result).toHaveLength(2);
        });

        it('does not query the database at all for an empty item list', async () => {
            const result = await repo.createMany('user-1', 'list-1', []);

            expect(client.query).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });
    });

    describe('uncheckAll()', () => {
        it('unchecks every item of the list in a single query', async () => {
            client.query.mockResolvedValue({
                rows: [
                    { id: 'a', user_id: 'user-1', category: 'clothing', name: 'Jacket', checked: false },
                    { id: 'b', user_id: 'user-1', category: 'clothing', name: 'Boots', checked: false },
                ],
            });

            const result = await repo.uncheckAll('list-1');

            expect(client.query).toHaveBeenCalledTimes(1);
            const [queryText, params] = client.query.mock.calls[0];
            expect(queryText).toMatch(/UPDATE packing_list_items SET checked = false/);
            expect(queryText).toMatch(/WHERE list_id = \$1/);
            expect(params).toEqual(['list-1']);
            expect(result).toHaveLength(2);
        });
    });

    // Regression: a template inserted in one statement got one timestamp for
    // every row, so its things came back in no particular order.
    it('keeps a template in its order by numbering its things', async () => {
        client.query.mockResolvedValue({ rows: [] });

        await repo.createMany('user-1', 'list-1', [{ category: 'van', name: 'Gas' }, { category: 'van', name: 'Toldo' }, { category: 'van', name: 'Calzos' }]);

        const params = client.query.mock.calls[0][1];
        expect([params[6], params[13], params[20]]).toEqual([1, 2, 3]);
    });

    it('puts a new item last in its list', async () => {
        client.query.mockResolvedValue({ rows: [{ id: 'a', list_id: 'list-1', category: 'van', name: 'Gas', position: 4 }] });

        await repo.create({ userId: 'user-1', listId: 'list-1', category: 'van', name: 'Gas' });

        expect(client.query.mock.calls[0][0]).toMatch(/COALESCE\(MAX\(position\), 0\) \+ 1 FROM packing_list_items WHERE list_id = \$3/);
    });
});
