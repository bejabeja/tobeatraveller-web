import { describe, it, expect, beforeEach } from 'vitest';
import { PackingChecklistService } from '../../services/packingChecklistService.js';

const makeItem = (overrides = {}) => ({
    id: 'item-1', userId: 'user-1', listId: 'list-1', category: 'clothing', name: 'Chaqueta impermeable', checked: false,
    toDTO() { return { id: this.id, listId: this.listId, category: this.category, name: this.name, checked: this.checked }; },
    ...overrides,
});

const makeList = (overrides = {}) => ({
    id: 'list-1', userId: 'user-1', name: 'Invierno',
    toDTO() { return { id: this.id, name: this.name }; },
    ...overrides,
});

const makeUser = ({ premium = false, role = 'user' } = {}) => ({ role, isPremium: () => premium });

describe('PackingChecklistService', () => {
    let items;
    let lists;
    let users;
    let trips;
    let service;

    beforeEach(() => {
        items = {
            create: async (data) => makeItem({ id: 'new-item', ...data }),
            createMany: async (userId, listId, rows) => rows.map((row, i) => makeItem({ id: `seed-${i}`, listId, ...row })),
            uncheckAll: async () => [],
            findByListId: async () => [],
            findById: async () => makeItem(),
            update: async (id, data) => makeItem({ id, ...data }),
            delete: async () => {},
        };
        lists = {
            create: async (data) => makeList({ id: 'new-list', ...data }),
            findByUserId: async () => [makeList()],
            findById: async (id) => makeList({ id }),
            countByUserId: async () => 0,
            update: async (id, data) => makeList({ id, ...data }),
            delete: async () => {},
        };
        users = { getUserById: async () => makeUser() };
        trips = { findById: async (id) => ({ id, userId: 'user-1' }) };
        service = new PackingChecklistService(items, lists, users, trips);
    });

    describe('free plan limit', () => {
        it('lets a free account keep two lists', async () => {
            lists.countByUserId = async () => 1;

            const result = await service.createList({ name: 'Antes de arrancar', items: [] }, 'user-1');

            expect(result.id).toBe('new-list');
        });

        it('stops a free account from making a third list', async () => {
            lists.countByUserId = async () => 2;

            await expect(service.createList({ name: 'Surf', items: [] }, 'user-1')).rejects.toMatchObject({ statusCode: 403, field: 'packingListCap' });
        });

        it('counts a copy as a new list', async () => {
            lists.countByUserId = async () => 2;

            await expect(service.duplicateList('list-1', 'Invierno (copia)', 'user-1')).rejects.toMatchObject({ field: 'packingListCap' });
        });

        it('has no limit with Premium', async () => {
            users.getUserById = async () => makeUser({ premium: true });
            lists.countByUserId = async () => 12;

            expect(await service.getFreeTierUsage('user-1')).toEqual({ limited: false, used: null, limit: 2 });
        });

        it('says how many lists a free account has used', async () => {
            lists.countByUserId = async () => 1;

            const { freeTierUsage } = await service.getLists('user-1');

            expect(freeTierUsage).toEqual({ limited: true, used: 1, limit: 2 });
        });
    });

    describe('createList()', () => {
        it('starts the list with the template, without the same thing twice in a category', async () => {
            let created;
            items.createMany = async (userId, listId, rows) => { created = { listId, rows }; return []; };

            await service.createList({
                name: 'Fin de semana',
                items: [{ category: 'clothing', name: 'Botas' }, { category: 'clothing', name: 'botas' }, { category: 'documents', name: 'Botas' }],
            }, 'user-1');

            expect(created).toEqual({
                listId: 'new-list',
                rows: [{ category: 'clothing', name: 'Botas' }, { category: 'documents', name: 'Botas' }],
            });
        });
    });

    describe('duplicateList()', () => {
        it('copies the things of the list into a new one, unticked', async () => {
            items.findByListId = async () => [makeItem({ checked: true }), makeItem({ id: 'item-2', name: 'Botas' })];
            let copied;
            items.createMany = async (userId, listId, rows) => { copied = { listId, names: rows.map(row => row.name) }; return []; };

            await service.duplicateList('list-1', 'Invierno (copia)', 'user-1');

            expect(copied).toEqual({ listId: 'new-list', names: ['Chaqueta impermeable', 'Botas'] });
        });

        it('refuses to copy someone else\'s list', async () => {
            lists.findById = async () => makeList({ userId: 'someone-else' });

            await expect(service.duplicateList('list-1', 'Mine now', 'user-1')).rejects.toThrow('Unauthorized');
        });
    });

    describe('trips', () => {
        it('starts a list for one of the user\'s trips', async () => {
            let created;
            lists.create = async (data) => { created = data; return makeList({ id: 'new-list', ...data }); };

            await service.createList({ name: 'Equipaje', items: [], itineraryId: 'trip-1' }, 'user-1');

            expect(created).toMatchObject({ userId: 'user-1', itineraryId: 'trip-1' });
        });

        it('refuses to link a list to someone else\'s trip', async () => {
            trips.findById = async (id) => ({ id, userId: 'someone-else' });

            await expect(service.createList({ name: 'Equipaje', items: [], itineraryId: 'trip-1' }, 'user-1')).rejects.toThrow('Unauthorized');
            await expect(service.updateList('list-1', { itineraryId: 'trip-1' }, 'user-1')).rejects.toThrow('Unauthorized');
        });

        it('links a list to a trip, keeping its name', async () => {
            let updated;
            lists.update = async (id, data) => { updated = data; return makeList({ id, ...data }); };

            await service.updateList('list-1', { itineraryId: 'trip-1' }, 'user-1');

            expect(updated).toEqual({ name: 'Invierno', itineraryId: 'trip-1' });
        });

        it('takes a list off its trip with null, and a rename leaves the trip alone', async () => {
            let updated;
            lists.findById = async (id) => makeList({ id, itineraryId: 'trip-1' });
            lists.update = async (id, data) => { updated = data; return makeList({ id, ...data }); };

            await service.updateList('list-1', { name: 'Invierno 2027' }, 'user-1');
            expect(updated).toEqual({ name: 'Invierno 2027', itineraryId: 'trip-1' });

            await service.updateList('list-1', { itineraryId: null }, 'user-1');
            expect(updated).toEqual({ name: 'Invierno', itineraryId: null });
        });

        it('makes a copy that isn\'t for any trip yet', async () => {
            let created;
            lists.findById = async (id) => makeList({ id, itineraryId: 'trip-1' });
            lists.create = async (data) => { created = data; return makeList({ id: 'new-list', ...data }); };

            await service.duplicateList('list-1', 'Invierno (copia)', 'user-1');

            expect(created.itineraryId).toBeUndefined();
        });
    });

    describe('updateList() and deleteList()', () => {
        it('throws NotFoundError when the list does not exist', async () => {
            lists.findById = async () => null;

            await expect(service.updateList('missing', { name: 'Nuevo' }, 'user-1')).rejects.toThrow('Packing list not found');
            await expect(service.deleteList('missing', 'user-1')).rejects.toThrow('Packing list not found');
        });

        it('refuses to delete someone else\'s list', async () => {
            lists.findById = async () => makeList({ userId: 'someone-else' });

            await expect(service.deleteList('list-1', 'user-1')).rejects.toThrow('Unauthorized');
        });
    });

    describe('addItem()', () => {
        // Without this, replaying a create whose response was lost would hit
        // the duplicate-name check against the item it inserted the first time.
        it('returns the item already created with that client id instead of a duplicate-name conflict', async () => {
            items.findById = async () => makeItem({ id: 'client-id-1', name: 'Botas' });
            items.findByListId = async () => [makeItem({ id: 'client-id-1', name: 'Botas' })];

            const result = await service.addItem('list-1', { id: 'client-id-1', category: 'clothing', name: 'Botas' }, 'user-1');

            expect(result.id).toBe('client-id-1');
        });

        it('adds the item to the list', async () => {
            items.findById = async () => null;

            const result = await service.addItem('list-1', { id: 'client-id-1', category: 'clothing', name: 'Botas' }, 'user-1');

            expect(result).toMatchObject({ id: 'client-id-1', listId: 'list-1', name: 'Botas' });
        });

        it('throws ConflictError when the list already has it in that category, whatever the case', async () => {
            items.findById = async () => null;
            items.findByListId = async () => [makeItem({ name: 'BOTAS' })];

            await expect(service.addItem('list-1', { category: 'clothing', name: 'botas' }, 'user-1')).rejects.toThrow('Item already in this category');
        });

        it('allows the same name in a different category', async () => {
            items.findById = async () => null;
            items.findByListId = async () => [makeItem({ name: 'Botas' })];

            const result = await service.addItem('list-1', { category: 'electronics', name: 'Botas' }, 'user-1');

            expect(result.name).toBe('Botas');
        });

        it('refuses to add to someone else\'s list', async () => {
            items.findById = async () => null;
            lists.findById = async () => makeList({ userId: 'someone-else' });

            await expect(service.addItem('list-1', { category: 'clothing', name: 'Botas' }, 'user-1')).rejects.toThrow('Unauthorized');
        });
    });

    describe('restartList()', () => {
        it('unticks the things of that list only', async () => {
            let unchecked;
            items.uncheckAll = async (listId) => { unchecked = listId; return [makeItem({ checked: false })]; };

            const result = await service.restartList('list-1', 'user-1');

            expect(unchecked).toBe('list-1');
            expect(result.every(item => item.checked === false)).toBe(true);
        });
    });

    describe('updateItem()', () => {
        it('toggles checked while leaving other fields untouched', async () => {
            let updateArgs;
            items.update = async (id, data) => { updateArgs = { id, data }; return makeItem({ id, ...data }); };

            await service.updateItem('item-1', { checked: true }, 'user-1');

            expect(updateArgs.data).toMatchObject({ checked: true, category: 'clothing', name: 'Chaqueta impermeable' });
        });

        it('renames it and moves it to another category', async () => {
            let updateArgs;
            items.update = async (id, data) => { updateArgs = data; return makeItem({ id, ...data }); };

            await service.updateItem('item-1', { name: 'Chubasquero', category: 'accessories' }, 'user-1');

            expect(updateArgs).toMatchObject({ name: 'Chubasquero', category: 'accessories', checked: false });
        });

        it('refuses a rename that would repeat something already in that category', async () => {
            items.findByListId = async () => [makeItem(), makeItem({ id: 'item-2', name: 'Botas' })];

            await expect(service.updateItem('item-1', { name: 'botas' }, 'user-1')).rejects.toThrow('Item already in this category');
        });

        it('says how many to take, and goes back to just the one with null', async () => {
            let updateArgs;
            items.findById = async () => makeItem({ quantity: 5 });
            items.update = async (id, data) => { updateArgs = data; return makeItem({ id, ...data }); };

            await service.updateItem('item-1', { checked: true }, 'user-1');
            expect(updateArgs.quantity).toBe(5);

            await service.updateItem('item-1', { quantity: null }, 'user-1');
            expect(updateArgs.quantity).toBeNull();
        });

        it('moves it to another place in its list', async () => {
            let updateArgs;
            items.findById = async () => makeItem({ position: 3 });
            items.update = async (id, data) => { updateArgs = data; return makeItem({ id, ...data }); };

            await service.updateItem('item-1', { position: 1 }, 'user-1');

            expect(updateArgs.position).toBe(1);
        });

        it('throws NotFoundError when the item does not exist', async () => {
            items.findById = async () => null;

            await expect(service.updateItem('missing', { checked: true }, 'user-1')).rejects.toThrow('Packing checklist item not found');
        });

        it('throws AuthError when the item belongs to another user', async () => {
            items.findById = async () => makeItem({ userId: 'someone-else' });

            await expect(service.updateItem('item-1', { checked: true }, 'user-1')).rejects.toThrow('Unauthorized');
        });
    });

    describe('deleteItem()', () => {
        it('throws NotFoundError when the item does not exist', async () => {
            items.findById = async () => null;

            await expect(service.deleteItem('missing', 'user-1')).rejects.toThrow('Packing checklist item not found');
        });

        it('throws AuthError when the item belongs to another user', async () => {
            items.findById = async () => makeItem({ userId: 'someone-else' });

            await expect(service.deleteItem('item-1', 'user-1')).rejects.toThrow('Unauthorized');
        });
    });
});
