import { describe, it, expect, beforeEach } from 'vitest';
import { PackingChecklistService } from '../../services/packingChecklistService.js';

const makeItem = (overrides = {}) => ({
    id: 'item-1', userId: 'user-1', category: 'clothing', name: 'Chaqueta impermeable', checked: false,
    toDTO() { return { id: this.id, category: this.category, name: this.name, checked: this.checked }; },
    ...overrides,
});

describe('PackingChecklistService', () => {
    let repository;
    let service;

    beforeEach(() => {
        repository = {
            create: async (data) => makeItem({ id: 'new-item', ...data }),
            createMany: async (userId, items) => items.map((it, i) => makeItem({ id: `seed-${i}`, ...it })),
            uncheckAll: async () => [],
            findByUserId: async () => [],
            findById: async () => makeItem(),
            update: async (id, data) => makeItem({ id, ...data }),
            delete: async () => {},
        };
        service = new PackingChecklistService(repository);
    });

    describe('addItem()', () => {
        // Without this, replaying a create whose response was lost would hit
        // the duplicate-name check against the item it inserted the first time.
        it('returns the item already created with that client id instead of a duplicate-name conflict', async () => {
            repository.findById = async () => makeItem({ id: 'client-id-1', category: 'clothing', name: 'Botas' });
            repository.findByUserId = async () => [makeItem({ id: 'client-id-1', category: 'clothing', name: 'Botas' })];

            const result = await service.addItem({ id: 'client-id-1', category: 'clothing', name: 'Botas' }, 'user-1');

            expect(result.id).toBe('client-id-1');
        });

        it('creates the item with the client id when nothing has that id yet', async () => {
            repository.findById = async () => null;

            const result = await service.addItem({ id: 'client-id-1', category: 'clothing', name: 'Botas' }, 'user-1');

            expect(result.id).toBe('client-id-1');
        });

        it('creates the item when nothing with the same name and category exists yet', async () => {
            const result = await service.addItem({ category: 'clothing', name: 'Botas' }, 'user-1');

            expect(result.name).toBe('Botas');
        });

        it('throws ConflictError when an item with the same name already exists in that category', async () => {
            repository.findByUserId = async () => [makeItem({ category: 'clothing', name: 'Botas' })];

            await expect(service.addItem({ category: 'clothing', name: 'Botas' }, 'user-1')).rejects.toThrow('Item already in this category');
        });

        it('matches the duplicate check case-insensitively', async () => {
            repository.findByUserId = async () => [makeItem({ category: 'clothing', name: 'BOTAS' })];

            await expect(service.addItem({ category: 'clothing', name: 'botas' }, 'user-1')).rejects.toThrow('Item already in this category');
        });

        it('allows the same name in a different category', async () => {
            repository.findByUserId = async () => [makeItem({ category: 'clothing', name: 'Botas' })];

            const result = await service.addItem({ category: 'electronics', name: 'Botas' }, 'user-1');

            expect(result.name).toBe('Botas');
        });
    });

    describe('resetTrip()', () => {
        it('unchecks every item and returns the updated checklist', async () => {
            repository.uncheckAll = async () => [makeItem({ checked: false }), makeItem({ id: 'item-2', checked: false })];

            const result = await service.resetTrip('user-1');

            expect(result).toHaveLength(2);
            expect(result.every(item => item.checked === false)).toBe(true);
        });
    });

    describe('seedDefaults()', () => {
        it('creates the default items when the user has none yet', async () => {
            let createManyArgs;
            repository.createMany = async (userId, items) => { createManyArgs = { userId, items }; return items.map((it, i) => makeItem({ id: `seed-${i}`, ...it })); };
            repository.findByUserId = async () => createManyArgs ? createManyArgs.items.map((it, i) => makeItem({ id: `seed-${i}`, ...it })) : [];

            const result = await service.seedDefaults([{ category: 'clothing', name: 'Chaqueta' }], 'user-1');

            expect(createManyArgs.items).toHaveLength(1);
            expect(result).toHaveLength(1);
        });

        it('only creates the items missing from what the user already has, instead of skipping the seed entirely', async () => {
            repository.findByUserId = async () => [makeItem({ category: 'clothing', name: 'Chaqueta' })];
            let createManyArgs;
            repository.createMany = async (userId, items) => { createManyArgs = { userId, items }; return items.map((it, i) => makeItem({ id: `new-${i}`, ...it })); };

            await service.seedDefaults([
                { category: 'clothing', name: 'Chaqueta' }, // already has this one
                { category: 'clothing', name: 'Botas' },    // missing, e.g. deleted earlier
            ], 'user-1');

            expect(createManyArgs.items).toEqual([{ category: 'clothing', name: 'Botas' }]);
        });

        it('matches existing items case-insensitively so it never creates a near-duplicate', async () => {
            repository.findByUserId = async () => [makeItem({ category: 'clothing', name: 'CHAQUETA' })];
            let createManyCalled = false;
            repository.createMany = async () => { createManyCalled = true; return []; };

            const result = await service.seedDefaults([{ category: 'clothing', name: 'chaqueta' }], 'user-1');

            expect(createManyCalled).toBe(false);
            expect(result).toHaveLength(1); // returns the existing checklist unchanged
        });

        it('does not query for creation when nothing is missing', async () => {
            repository.findByUserId = async () => [makeItem(), makeItem({ id: 'item-2' })];
            let createManyCalled = false;
            repository.createMany = async () => { createManyCalled = true; return []; };

            const result = await service.seedDefaults([{ category: 'clothing', name: 'Chaqueta impermeable' }], 'user-1');

            expect(createManyCalled).toBe(false);
            expect(result).toHaveLength(2);
        });
    });

    describe('updateItem()', () => {
        it('toggles checked while leaving other fields untouched', async () => {
            let updateArgs;
            repository.update = async (id, data) => { updateArgs = { id, data }; return makeItem({ id, ...data }); };

            await service.updateItem('item-1', { checked: true }, 'user-1');

            expect(updateArgs.data).toMatchObject({ checked: true, category: 'clothing', name: 'Chaqueta impermeable' });
        });

        it('throws NotFoundError when the item does not exist', async () => {
            repository.findById = async () => null;

            await expect(service.updateItem('missing', { checked: true }, 'user-1')).rejects.toThrow('Packing checklist item not found');
        });

        it('throws AuthError when the item belongs to another user', async () => {
            repository.findById = async () => makeItem({ userId: 'someone-else' });

            await expect(service.updateItem('item-1', { checked: true }, 'user-1')).rejects.toThrow('Unauthorized');
        });
    });

    describe('deleteItem()', () => {
        it('throws NotFoundError when the item does not exist', async () => {
            repository.findById = async () => null;

            await expect(service.deleteItem('missing', 'user-1')).rejects.toThrow('Packing checklist item not found');
        });

        it('throws AuthError when the item belongs to another user', async () => {
            repository.findById = async () => makeItem({ userId: 'someone-else' });

            await expect(service.deleteItem('item-1', 'user-1')).rejects.toThrow('Unauthorized');
        });
    });
});
