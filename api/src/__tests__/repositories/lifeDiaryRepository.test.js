import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn() },
}));

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));

import client from '../../db/clientPostgres.js';
import { LifeDiaryRepository } from '../../repositories/lifeDiaryRepository.js';

describe('LifeDiaryRepository', () => {
    const repo = new LifeDiaryRepository();

    beforeEach(() => {
        client.query.mockReset();
    });

    it('creates an entry with the generated id and scoped to the given user', async () => {
        client.query.mockResolvedValue({
            rows: [{
                id: 'mock-uuid', user_id: 'user-1', location_name: 'Camping Els Pins', location_country: 'Spain',
                location_label: 'Camping Els Pins, Spain', latitude: '41.500000', longitude: '2.100000',
                entry_date: '2026-03-01', best_moment: 'Sunrise over the lake', lesson_learned: null,
                memories: null, people_met: null, would_return: true, created_at: null, updated_at: null,
            }],
        });

        const entry = await repo.create({
            userId: 'user-1',
            location: { name: 'Camping Els Pins', country: 'Spain', label: 'Camping Els Pins, Spain', lat: 41.5, lon: 2.1 },
            entryDate: '2026-03-01',
            bestMoment: 'Sunrise over the lake',
            wouldReturn: true,
        });

        expect(entry.id).toBe('mock-uuid');
        expect(entry.location.name).toBe('Camping Els Pins');
        expect(entry.wouldReturn).toBe(true);
        const [, params] = client.query.mock.calls[0];
        expect(params[0]).toBe('mock-uuid');
        expect(params[1]).toBe('user-1');
    });

    it('only fetches entries belonging to the requested user, most recent first', async () => {
        client.query.mockResolvedValue({ rows: [] });

        await repo.findByUserId('user-1');

        const [queryText, params] = client.query.mock.calls[0];
        expect(queryText).toMatch(/WHERE user_id = \$1/);
        expect(queryText).toMatch(/ORDER BY entry_date DESC/);
        expect(params).toEqual(['user-1']);
    });

    it('counts how many entries belong to the given user', async () => {
        client.query.mockResolvedValue({ rows: [{ count: 4 }] });

        const count = await repo.countByUserId('user-1');

        expect(count).toBe(4);
        const [queryText, params] = client.query.mock.calls[0];
        expect(queryText).toMatch(/COUNT\(\*\)/);
        expect(queryText).toMatch(/WHERE user_id = \$1/);
        expect(params).toEqual(['user-1']);
    });

    it('returns null when finding a non-existent entry', async () => {
        client.query.mockResolvedValue({ rows: [] });

        const result = await repo.findById('missing-id');

        expect(result).toBeNull();
    });

    it('returns null when updating a non-existent entry', async () => {
        client.query.mockResolvedValue({ rows: [] });

        const result = await repo.update('missing-id', { entryDate: '2026-03-01' });

        expect(result).toBeNull();
    });

    describe('linkImage() / unlinkImage()', () => {
        it('inserts an image row scoped to the entry with the given order', async () => {
            client.query.mockResolvedValue({ rows: [] });

            const image = await repo.linkImage('entry-1', 'https://cdn.example.com/a.jpg', 'pub-1', 2);

            expect(image).toEqual({ id: 'mock-uuid', entryId: 'entry-1', photoUrl: 'https://cdn.example.com/a.jpg', photoPublicId: 'pub-1', orderIndex: 2 });
            const [, params] = client.query.mock.calls[0];
            expect(params).toEqual(['mock-uuid', 'entry-1', 'https://cdn.example.com/a.jpg', 'pub-1', 2]);
        });

        it('deletes only the image scoped to the given entry', async () => {
            client.query.mockResolvedValue({ rows: [] });

            await repo.unlinkImage('entry-1', 'img-1');

            const [queryText, params] = client.query.mock.calls[0];
            expect(queryText).toMatch(/WHERE entry_id = \$1 AND id = \$2/);
            expect(params).toEqual(['entry-1', 'img-1']);
        });
    });

    describe('getImagesByEntryIds()', () => {
        it('does not query the database for an empty id list', async () => {
            const result = await repo.getImagesByEntryIds([]);

            expect(client.query).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it('fetches every image for the given entries in order', async () => {
            client.query.mockResolvedValue({
                rows: [
                    { id: 'img-1', entry_id: 'entry-1', photo_url: 'https://cdn.example.com/a.jpg', photo_public_id: 'pub-1', order_index: 0 },
                ],
            });

            const result = await repo.getImagesByEntryIds(['entry-1']);

            expect(result).toEqual([{ id: 'img-1', entryId: 'entry-1', photoUrl: 'https://cdn.example.com/a.jpg', photoPublicId: 'pub-1', orderIndex: 0 }]);
            const [queryText, params] = client.query.mock.calls[0];
            expect(queryText).toMatch(/entry_id = ANY\(\$1\)/);
            expect(params).toEqual([['entry-1']]);
        });
    });

    describe('findImagePublicIdsByUserId()', () => {
        it('returns the public ids of every image across all of the user\'s entries', async () => {
            client.query.mockResolvedValue({
                rows: [{ photo_public_id: 'pub-1' }, { photo_public_id: 'pub-2' }],
            });

            const publicIds = await repo.findImagePublicIdsByUserId('user-1');

            expect(publicIds).toEqual(['pub-1', 'pub-2']);
            const [queryText, params] = client.query.mock.calls[0];
            expect(queryText).toMatch(/JOIN life_diary_entries/);
            expect(params).toEqual(['user-1']);
        });
    });
});
